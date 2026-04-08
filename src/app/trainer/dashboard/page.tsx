import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOutAction } from '@/app/auth/login/actions'

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const statusLabel: Record<string, string> = {
  pending: '未承認',
  confirmed: '確定',
  cancelled: 'キャンセル',
  completed: '完了',
}

const statusColor: Record<string, string> = {
  pending: 'bg-[#FEF3C7] text-[#92400E]',
  confirmed: 'bg-[#DCFCE7] text-[#166534]',
  cancelled: 'bg-[#F3F4F6] text-[#6B7280]',
  completed: 'bg-[#EFF6FF] text-[#1E40AF]',
}

export default async function TrainerDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('name')
    .eq('id', user.id)
    .maybeSingle()

  const { data: myTrainerProfile } = await supabase
    .from('trainer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const trainerIdsForQuery = [user.id, myTrainerProfile?.id].filter(Boolean) as string[]

  const now = new Date()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { data: todayBookings } = await supabase
    .from('bookings')
    .select('id, scheduled_at, status, trainee_id')
    .in('trainer_id', trainerIdsForQuery)
    .gte('scheduled_at', todayStart.toISOString())
    .lte('scheduled_at', todayEnd.toISOString())
    .order('scheduled_at')

  const traineeIds = (todayBookings ?? []).map((b) => b.trainee_id)
  const { data: traineeNames } = traineeIds.length
    ? await supabase.from('users').select('id, name').in('id', traineeIds)
    : { data: [] }

  const traineeMap = Object.fromEntries(
    (traineeNames ?? []).map((t) => [t.id, t.name])
  )

  const { data: salesData } = await supabase
    .from('sales_records')
    .select('amount')
    .in('trainer_id', trainerIdsForQuery)
    .gte('paid_at', monthStart.toISOString())

  const totalSales = (salesData ?? []).reduce((sum, r) => sum + r.amount, 0)

  const { count: clientCount } = myTrainerProfile
    ? await supabase
        .from('trainer_trainee')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', myTrainerProfile.id)
        .eq('status', 'active')
    : { count: 0 }

  const { count: pendingCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .in('trainer_id', trainerIdsForQuery)
    .eq('status', 'pending')

  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#0066FF]">
            {now.getMonth() + 1}月{now.getDate()}日（{WEEKDAYS[now.getDay()]}）
          </p>
          <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0A0A0A] mt-0.5">
            {userData?.name ?? ''} さん
          </h1>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-sm font-medium text-[#6B7280] h-10 px-3 rounded-full hover:bg-[#F3F4F6] transition-colors"
          >
            ログアウト
          </button>
        </form>
      </div>

      {/* 今日の予約 */}
      <div>
        <h2 className="text-base font-bold text-[#0A0A0A] mb-3">今日の予約</h2>
        {!todayBookings?.length ? (
          <div className="bg-white rounded-[20px] p-6 text-center border border-[#E5E7EB]">
            <p className="text-2xl mb-2">☕</p>
            <p className="text-sm font-semibold text-[#6B7280]">今日は予約なし</p>
            <p className="text-xs text-[#9CA3AF] mt-1">ゆっくり休んでください</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-[20px] px-4 py-4 border border-[#E5E7EB] shadow-[0px_1px_3px_rgba(0,0,0,0.04),0px_1px_2px_rgba(0,0,0,0.06)] flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-[#0A0A0A]">
                    {traineeMap[booking.trainee_id] ?? '不明'}
                  </p>
                  <p className="text-sm text-[#6B7280] mt-0.5">
                    {formatDate(booking.scheduled_at)}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-[0.08em] px-[10px] py-[3px] rounded-[6px] ${statusColor[booking.status] ?? 'bg-[#F3F4F6] text-[#6B7280]'}`}
                >
                  {statusLabel[booking.status] ?? booking.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 今月の売上 */}
      <div className="bg-[#0A0A0A] rounded-[20px] p-5 text-white">
        <p className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.1em]">
          {now.getMonth() + 1}月の売上
        </p>
        <p className="text-4xl font-black mt-1 tracking-tight tabular-nums">
          ¥{totalSales.toLocaleString()}
        </p>
      </div>

      {/* サブサマリー */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-[20px] p-4 border border-[#E5E7EB] shadow-[0px_1px_3px_rgba(0,0,0,0.04),0px_1px_2px_rgba(0,0,0,0.06)] text-center">
          <p className="text-xs text-[#6B7280] font-medium">担当お客さん</p>
          <p className="text-2xl font-black text-[#0A0A0A] mt-1 tabular-nums">
            {clientCount ?? 0}
            <span className="text-sm font-normal text-[#6B7280] ml-1">名</span>
          </p>
        </div>
        <Link
          href="/trainer/bookings"
          className="relative block bg-white rounded-[20px] p-4 border border-[#E5E7EB] shadow-[0px_1px_3px_rgba(0,0,0,0.04),0px_1px_2px_rgba(0,0,0,0.06)] text-center"
        >
          <p className="text-xs text-[#6B7280] font-medium">承認待ち</p>
          <p className="text-2xl font-black text-[#0A0A0A] mt-1 tabular-nums">
            {pendingCount ?? 0}
            <span className="text-sm font-normal text-[#6B7280] ml-1">件</span>
          </p>
          {(pendingCount ?? 0) > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#EF4444] rounded-full" />
          )}
        </Link>
      </div>
    </div>
  )
}
