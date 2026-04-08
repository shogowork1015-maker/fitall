import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { SalesBarChart, type MonthlySales } from '@/components/charts/SalesBarChart'

export default async function TrainerSalesPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: trainerProfile } = await supabase
    .from('trainer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const trainerIdsForQuery = [user.id, trainerProfile?.id].filter(Boolean) as string[]

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  const { data: currentRecords } = await supabase
    .from('sales_records')
    .select('id, amount, paid_at, booking_id')
    .in('trainer_id', trainerIdsForQuery)
    .gte('paid_at', monthStart.toISOString())
    .order('paid_at', { ascending: false })

  const { data: prevRecords } = await supabase
    .from('sales_records')
    .select('amount')
    .in('trainer_id', trainerIdsForQuery)
    .gte('paid_at', prevMonthStart.toISOString())
    .lte('paid_at', prevMonthEnd.toISOString())

  const currentTotal = (currentRecords ?? []).reduce((sum, r) => sum + r.amount, 0)
  const prevTotal = (prevRecords ?? []).reduce((sum, r) => sum + r.amount, 0)

  const bookingIds = (currentRecords ?? []).map((r) => r.booking_id)
  const { data: bookings } = bookingIds.length
    ? await supabase
        .from('bookings')
        .select('id, trainee_id, scheduled_at')
        .in('id', bookingIds)
    : { data: [] }

  const traineeIds = [...new Set((bookings ?? []).map((b) => b.trainee_id))]
  const { data: trainees } = traineeIds.length
    ? await supabase.from('users').select('id, name').in('id', traineeIds)
    : { data: [] }

  const traineeMap = Object.fromEntries((trainees ?? []).map((t) => [t.id, t.name]))
  const bookingMap = Object.fromEntries((bookings ?? []).map((b) => [b.id, b]))

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const { data: allRecords } = await supabase
    .from('sales_records')
    .select('amount, paid_at')
    .in('trainer_id', trainerIdsForQuery)
    .gte('paid_at', sixMonthsAgo.toISOString())

  const monthlyMap: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getMonth() + 1}月`
    monthlyMap[key] = 0
  }
  for (const r of allRecords ?? []) {
    const d = new Date(r.paid_at)
    const key = `${d.getMonth() + 1}月`
    if (key in monthlyMap) monthlyMap[key] += r.amount
  }
  const monthlySalesData: MonthlySales[] = Object.entries(monthlyMap).map(
    ([month, amount]) => ({ month, amount })
  )

  const diff = currentTotal - prevTotal
  const diffSign = diff >= 0 ? '+' : ''

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0A0A0A]">
        売上管理
      </h1>

      {/* サマリーカード */}
      <div className="bg-[#0A0A0A] rounded-[20px] p-5 text-white">
        <p className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.1em]">
          {now.getMonth() + 1}月の売上合計
        </p>
        <p className="text-4xl font-black mt-1 tracking-tight tabular-nums">
          ¥{currentTotal.toLocaleString()}
        </p>
        <p className="text-sm mt-3 text-[#6B7280]">
          先月比{' '}
          <span className={diff >= 0 ? 'text-[#22C55E] font-semibold' : 'text-[#EF4444] font-semibold'}>
            {diffSign}¥{Math.abs(diff).toLocaleString()}
          </span>
        </p>
      </div>

      {/* 月次グラフ */}
      <div>
        <h2 className="text-base font-bold text-[#0A0A0A] mb-3">月次売上（直近6ヶ月）</h2>
        <SalesBarChart data={monthlySalesData} />
      </div>

      {/* 件数サマリー */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-[20px] p-4 border border-[#E5E7EB] shadow-[0px_1px_3px_rgba(0,0,0,0.04),0px_1px_2px_rgba(0,0,0,0.06)] text-center">
          <p className="text-xs text-[#6B7280] font-medium">今月のセッション数</p>
          <p className="text-2xl font-black text-[#0A0A0A] mt-1 tabular-nums">
            {currentRecords?.length ?? 0}
            <span className="text-sm font-normal text-[#6B7280] ml-1">回</span>
          </p>
        </div>
        <div className="bg-white rounded-[20px] p-4 border border-[#E5E7EB] shadow-[0px_1px_3px_rgba(0,0,0,0.04),0px_1px_2px_rgba(0,0,0,0.06)] text-center">
          <p className="text-xs text-[#6B7280] font-medium">先月の売上</p>
          <p className="text-lg font-black text-[#0A0A0A] mt-1 tabular-nums">
            ¥{prevTotal.toLocaleString()}
          </p>
        </div>
      </div>

      {/* 売上明細 */}
      <div>
        <h2 className="text-base font-bold text-[#0A0A0A] mb-3">今月の明細</h2>
        {!currentRecords?.length ? (
          <div className="bg-white rounded-[20px] p-6 text-center text-sm text-[#9CA3AF] border border-[#E5E7EB]">
            今月の売上はまだありません
          </div>
        ) : (
          <div className="space-y-2">
            {currentRecords.map((record) => {
              const booking = bookingMap[record.booking_id]
              const traineeName = booking ? traineeMap[booking.trainee_id] : '不明'

              return (
                <div
                  key={record.id}
                  className="bg-white rounded-[20px] px-4 py-3 border border-[#E5E7EB] shadow-[0px_1px_3px_rgba(0,0,0,0.04),0px_1px_2px_rgba(0,0,0,0.06)] flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold text-[#0A0A0A]">{traineeName ?? '不明'}</p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      {new Date(record.paid_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <p className="font-bold text-[#0A0A0A] tabular-nums">
                    ¥{record.amount.toLocaleString()}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
