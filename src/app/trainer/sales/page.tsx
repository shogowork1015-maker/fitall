import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { SalesBarChart, type MonthlySales } from '@/components/charts/SalesBarChart'
import { loadTraineeNameMap } from '@/lib/trainee-display'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'
import {
  addMonthsToDateKey,
  formatJstDate,
  formatJstDateKey,
  jstMonthBounds,
  parseJstDateTime,
} from '@/lib/datetime'

interface SalesRecordView {
  id: string
  name: string
  amount: number
  date: string
  quantity: number
}

function yen(amount: number) {
  return `¥${amount.toLocaleString()}`
}

function monthLabel(dateKeyOrValue: string | Date) {
  return formatJstDate(dateKeyOrValue, { month: 'numeric' })
}

function SalesScreen({
  now,
  currentTotal,
  prevTotal,
  currentSoldSessions,
  monthlySalesData,
  records,
  preview = false,
}: {
  now: Date
  currentTotal: number
  prevTotal: number
  currentSoldSessions: number
  monthlySalesData: MonthlySales[]
  records: SalesRecordView[]
  preview?: boolean
}) {
  const diff = currentTotal - prevTotal
  const diffRate = prevTotal > 0 ? Math.round((diff / prevTotal) * 100) : 0
  const sessionGoal = Math.max(20, Math.ceil(currentSoldSessions / 5) * 5)
  const progress = Math.min(100, Math.round((currentSoldSessions / sessionGoal) * 100))
  const remainingSessions = Math.max(0, sessionGoal - currentSoldSessions)
  const averageTicket = currentSoldSessions > 0 ? Math.round(currentTotal / currentSoldSessions) : 0

  return (
    <>
    <div className="fitall-mobile-ui flex min-w-0 flex-col overflow-hidden bg-white">
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b-2 border-[#DDE8E8]">
        <div className="w-10" />
        <h1 className="text-[17px] font-black text-[#0A0A0A] flex-1 text-center">売上管理</h1>
        <div className="w-10" />
      </div>

      <div className="mx-4 w-[358px] max-w-[calc(100vw-48px)] min-w-0 py-5 space-y-5 overflow-hidden">
        {preview && (
          <div className="rounded-[6px] border border-[#12C7BE] bg-[#E8FBFA] px-4 py-3 text-xs font-bold text-[#087D78]">
            開発用UI確認モードです。売上データはサンプルです。
          </div>
        )}

        <div className="fitall-card-pop overflow-hidden rounded-[6px] border-2 border-[#0A0A0A] bg-white">
          <div className="border-b-2 border-[#0A0A0A] bg-[#12C7BE] px-4 py-4 text-white">
            <p className="text-[11px] font-black tracking-[0.12em]">THIS MONTH</p>
            <p className="mt-1 text-sm font-bold">{monthLabel(now)}の売上ダッシュ</p>
          </div>

          <div className="px-4 py-5">
            <p className="text-xs font-black text-[#555555]">いま入っている金額</p>
            <div className="mt-1">
              <h2 className="fitall-money-flash text-[40px] leading-none font-black tracking-tight text-[#0A0A0A]">
                {yen(currentTotal)}
              </h2>
              <p className={`mt-2 text-sm font-black ${diff >= 0 ? 'text-[#087D78]' : 'text-[#D4183D]'}`}>
                先月比 {diff >= 0 ? '+' : '-'}{yen(Math.abs(diff))} / {diffRate >= 0 ? '+' : ''}{diffRate}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr] border-t border-[#DDE8E8]">
            <div className="border-r border-[#DDE8E8] px-4 py-3">
              <p className="text-[10px] font-black text-[#555555]">販売回数</p>
              <p className="mt-1 text-2xl font-black text-[#0A0A0A]">{currentSoldSessions}<span className="ml-1 text-xs">回</span></p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] font-black text-[#555555]">目標</p>
              <p className="mt-1 text-2xl font-black text-[#0A0A0A]">{sessionGoal}<span className="ml-1 text-xs">回</span></p>
            </div>
          </div>

          <div className="border-t border-[#DDE8E8] px-4 py-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-black text-[#0A0A0A]">販売ペース</p>
              <p className="text-xs font-black text-[#087D78]">
                {remainingSessions === 0 ? '目標達成' : `あと${remainingSessions}回で${sessionGoal}回`}
              </p>
            </div>
            <div className="h-4 overflow-hidden rounded-[3px] border border-[#0A0A0A] bg-white">
              <div
                className="h-full bg-[#12C7BE] transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[6px] border-2 border-[#DDE8E8] bg-white p-4">
            <p className="text-[10px] font-black text-[#555555]">平均単価</p>
            <p className="mt-2 text-2xl font-black text-[#0A0A0A]">{yen(averageTicket)}</p>
            <p className="mt-1 text-[11px] font-bold text-[#087D78]">1チケットあたり</p>
          </div>
          <div className="rounded-[6px] border-2 border-[#DDE8E8] bg-white p-4">
            <p className="text-[10px] font-black text-[#555555]">先月の売上</p>
            <p className="mt-2 text-2xl font-black text-[#0A0A0A]">{yen(prevTotal)}</p>
            <p className="mt-1 text-[11px] font-bold text-[#087D78]">比較用</p>
          </div>
        </div>

        <div className="rounded-[6px] border-2 border-[#DDE8E8] bg-white p-4">
          <div className="mb-3">
            <h2 className="text-xs font-black uppercase tracking-[0.12em] text-[#0A0A0A]">6ヶ月の流れ</h2>
            <p className="mt-1 text-[10px] font-black text-[#087D78]">水色の棒が月ごとの売上です</p>
          </div>
          <SalesBarChart data={monthlySalesData} />
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-[0.12em] text-[#0A0A0A]">今月の明細</h2>
            <span className="text-[11px] font-bold text-[#555555]">{records.length}件</span>
          </div>

          {!records.length ? (
            <div className="rounded-[6px] border-2 border-dashed border-[#DDE8E8] bg-white p-6 text-center text-sm font-bold text-[#555555]">
              今月の売上はまだありません
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((record, index) => (
                <div
                  key={record.id}
                  className="fitall-card-pop grid grid-cols-[38px_1fr] items-center gap-3 rounded-[6px] border-2 border-[#DDE8E8] bg-white p-3"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-[#12C7BE] text-sm font-black text-white">
                    {record.quantity}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#0A0A0A]">{record.name}</h3>
                    <p className="mt-0.5 text-[11px] font-bold text-[#555555]">
                      {new Date(record.date).toLocaleDateString('ja-JP')} / {record.quantity}回チケット
                    </p>
                  </div>
                  <div className="col-span-2 border-t border-[#DDE8E8] pt-2">
                    <p className="text-base font-black text-[#0A0A0A]">{yen(record.amount)}</p>
                    <p className="text-[10px] font-black text-[#087D78]">支払済</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    <div className="fitall-desktop-ui fitall-desktop-page">
      <div className="fitall-desktop-container">
        <header className="fitall-desktop-header">
          <div>
            <p className="fitall-kicker">SALES</p>
            <h1 className="fitall-desktop-title">売上管理</h1>
            <p className="mt-2 text-sm font-bold text-[#555555]">
              PCでは月次売上、販売回数、明細をまとめて確認できます。
            </p>
          </div>
          <div className="fitall-pill fitall-pill-aqua">{now.getMonth() + 1}月</div>
        </header>

        {preview && (
          <div className="fitall-desktop-card mb-5 bg-[#E8FBFA] px-5 py-3 text-sm font-black text-[#087D78]">
            開発用UI確認モードです。売上データはサンプルです。
          </div>
        )}

        <section className="grid grid-cols-[1.4fr_.8fr_.8fr] gap-4">
          <div className="fitall-desktop-card border-[#0A0A0A]">
            <div className="bg-[#12C7BE] px-5 py-4 text-white">
              <p className="text-[10px] font-black tracking-[0.12em] text-white/80">THIS MONTH</p>
              <p className="mt-1 text-lg font-black">{now.getMonth() + 1}月の売上</p>
            </div>
            <div className="p-6">
              <p className="text-sm font-black text-[#555555]">いま入っている金額</p>
              <h2 className="mt-2 text-6xl font-black leading-none text-[#0A0A0A]">{yen(currentTotal)}</h2>
              <p className={`mt-3 text-base font-black ${diff >= 0 ? 'text-[#087D78]' : 'text-[#D4183D]'}`}>
                先月比 {diff >= 0 ? '+' : '-'}{yen(Math.abs(diff))} / {diffRate >= 0 ? '+' : ''}{diffRate}%
              </p>
            </div>
          </div>

          <div className="fitall-desktop-card p-5">
            <p className="fitall-kicker">SOLD</p>
            <p className="mt-4 text-5xl font-black text-[#0A0A0A]">{currentSoldSessions}<span className="ml-1 text-base">回</span></p>
            <p className="mt-2 text-sm font-bold text-[#555555]">販売回数</p>
          </div>

          <div className="fitall-desktop-card p-5">
            <p className="fitall-kicker">AVERAGE</p>
            <p className="mt-4 text-4xl font-black text-[#0A0A0A]">{yen(averageTicket)}</p>
            <p className="mt-2 text-sm font-bold text-[#555555]">平均単価</p>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-[1.15fr_.85fr] gap-4">
          <div className="fitall-desktop-card p-5">
            <div className="mb-4">
              <h2 className="fitall-section-title">6ヶ月の流れ</h2>
              <p className="mt-1 text-xs font-black text-[#087D78]">水色の棒が月ごとの売上です</p>
            </div>
            <SalesBarChart data={monthlySalesData} />
          </div>

          <div className="fitall-desktop-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="fitall-section-title">今月の明細</h2>
              <span className="text-sm font-black text-[#555555]">{records.length}件</span>
            </div>
            {!records.length ? (
              <div className="rounded-[6px] border-2 border-dashed border-[#DDE8E8] bg-white p-6 text-center text-sm font-bold text-[#555555]">
                今月の売上はまだありません
              </div>
            ) : (
              <div className="divide-y divide-[#DDE8E8]">
                {records.map((record) => (
                  <div key={record.id} className="grid grid-cols-[40px_1fr_auto] items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-[#12C7BE] text-sm font-black text-white">
                      {record.quantity}
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#0A0A0A]">{record.name}</p>
                      <p className="mt-0.5 text-xs font-bold text-[#555555]">
                        {new Date(record.date).toLocaleDateString('ja-JP')} / {record.quantity}回
                      </p>
                    </div>
                    <p className="text-base font-black text-[#0A0A0A]">{yen(record.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
    </>
  )
}

export default async function TrainerSalesPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const devAuthBypass = isDevAuthBypassEnabled()

  if (!user && !devAuthBypass) redirect('/auth/login')

  if (!user && devAuthBypass) {
    const now = parseJstDateTime(formatJstDateKey(), '12:00')
    const monthlySalesData: MonthlySales[] = [
      { month: '2月', amount: 82000 },
      { month: '3月', amount: 96000 },
      { month: '4月', amount: 112000 },
      { month: '5月', amount: 104000 },
      { month: '6月', amount: 128000 },
      { month: '7月', amount: 64000 },
    ]
    const records = [
      { id: 'r1', name: '佐藤さん', amount: 8800, date: now.toISOString(), quantity: 1 },
      { id: 'r2', name: '田中さん', amount: 32000, date: now.toISOString(), quantity: 4 },
      { id: 'r3', name: '山本さん', amount: 8800, date: now.toISOString(), quantity: 1 },
    ]

    return (
      <SalesScreen
        now={now}
        currentTotal={128000}
        prevTotal={104000}
        currentSoldSessions={18}
        monthlySalesData={monthlySalesData}
        records={records}
        preview
      />
    )
  }

  const { data: trainerProfile } = await supabase
    .from('trainer_profiles')
    .select('id')
    .eq('user_id', user!.id)
    .maybeSingle()

  const trainerIdsForQuery = [user!.id, trainerProfile?.id].filter(Boolean) as string[]

  const todayKey = formatJstDateKey()
  const now = parseJstDateTime(todayKey, '12:00')
  const currentMonthKey = addMonthsToDateKey(todayKey, 0)
  const prevMonthKey = addMonthsToDateKey(todayKey, -1)
  const { start: monthStart } = jstMonthBounds(currentMonthKey)
  const { start: prevMonthStart, end: prevMonthEnd } = jstMonthBounds(prevMonthKey)

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

  const traineeMap = await loadTraineeNameMap(
    supabase,
    (bookings ?? []).map((b) => b.trainee_id)
  )
  const bookingMap = Object.fromEntries((bookings ?? []).map((b) => [b.id, b]))

  const { data: saleCredits } = bookingIds.length
    ? await supabase
        .from('session_credits')
        .select('booking_id, purchase_id')
        .in('booking_id', bookingIds)
    : { data: [] }
  const purchaseIds = [...new Set((saleCredits ?? []).map((c) => c.purchase_id).filter(Boolean))]
  const { data: purchases } = purchaseIds.length
    ? await supabase
        .from('session_credit_purchases')
        .select('id, quantity')
        .in('id', purchaseIds)
    : { data: [] }
  const purchaseQuantityById = Object.fromEntries(
    (purchases ?? []).map((p) => [p.id, p.quantity ?? 1])
  )
  const purchaseIdByBookingId = Object.fromEntries(
    (saleCredits ?? []).map((c) => [c.booking_id, c.purchase_id])
  )
  const currentSoldSessions = (currentRecords ?? []).reduce((sum, record) => {
    const purchaseId = purchaseIdByBookingId[record.booking_id]
    return sum + (purchaseQuantityById[purchaseId] ?? 1)
  }, 0)

  const sixMonthsAgoKey = addMonthsToDateKey(todayKey, -5)
  const { start: sixMonthsAgo } = jstMonthBounds(sixMonthsAgoKey)
  const { data: allRecords } = await supabase
    .from('sales_records')
    .select('amount, paid_at')
    .in('trainer_id', trainerIdsForQuery)
    .gte('paid_at', sixMonthsAgo.toISOString())

  const monthlyMap: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const keyDate = parseJstDateTime(addMonthsToDateKey(todayKey, -i), '00:00')
    const key = monthLabel(keyDate)
    monthlyMap[key] = 0
  }
  for (const r of allRecords ?? []) {
    const key = monthLabel(r.paid_at)
    if (key in monthlyMap) monthlyMap[key] += r.amount
  }
  const monthlySalesData: MonthlySales[] = Object.entries(monthlyMap).map(
    ([month, amount]) => ({ month, amount })
  )

  const recordViews: SalesRecordView[] = (currentRecords ?? []).map((record) => {
    const booking = bookingMap[record.booking_id]
    const purchaseId = purchaseIdByBookingId[record.booking_id]
    return {
      id: record.id,
      name: booking ? traineeMap[booking.trainee_id] : '不明',
      amount: record.amount,
      date: record.paid_at,
      quantity: purchaseQuantityById[purchaseId] ?? 1,
    }
  })

  return (
    <SalesScreen
      now={now}
      currentTotal={currentTotal}
      prevTotal={prevTotal}
      currentSoldSessions={currentSoldSessions}
      monthlySalesData={monthlySalesData}
      records={recordViews}
    />
  )
}
