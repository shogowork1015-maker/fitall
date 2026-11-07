import { loadTrainerRevenue, trainerRevenueErrorMessage } from '@/lib/trainer-revenue'
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
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-line">
        <div className="w-14" />
        <h1 className="text-[17px] font-black text-ink flex-1 text-center">売上管理</h1>
        <div className="w-14" />
      </div>

      <div className="fitall-page-pad space-y-4">
        {preview && (
          <div className="rounded-control border border-accent bg-accent-soft px-4 py-3 text-base font-bold text-brand">
            開発用UI確認モードです。売上データはサンプルです。
          </div>
        )}

        <div className="fitall-card-strong overflow-hidden">
          <div className="bg-accent px-4 py-4 text-ink">
            <p className="text-base font-bold">今月</p>
            <p className="mt-1 text-base font-bold">{monthLabel(now)}の売上ダッシュ</p>
          </div>

          <div className="px-4 py-5">
            <p className="text-base font-medium text-ink-muted">いま入っている金額</p>
            <div className="mt-1">
              <h2 className="text-[40px] leading-none font-black tracking-tight text-ink">
                {yen(currentTotal)}
              </h2>
              <p className={`mt-2 text-base font-bold ${diff >= 0 ? 'text-brand' : 'text-danger'}`}>
                先月比 {diff >= 0 ? '+' : '-'}{yen(Math.abs(diff))} / {diffRate >= 0 ? '+' : ''}{diffRate}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr] border-t border-line">
            <div className="border-r border-line px-4 py-3">
              <p className="text-base font-medium text-ink-muted">販売回数</p>
              <p className="mt-1 text-2xl font-black text-ink">{currentSoldSessions}<span className="ml-1 text-base">回</span></p>
            </div>
            <div className="px-4 py-3">
              <p className="text-base font-medium text-ink-muted">目標</p>
              <p className="mt-1 text-2xl font-black text-ink">{sessionGoal}<span className="ml-1 text-base">回</span></p>
            </div>
          </div>

          <div className="border-t border-line px-4 py-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-base font-bold text-ink">販売ペース</p>
              <p className="text-base font-bold text-brand">
                {remainingSessions === 0 ? '目標達成' : `あと${remainingSessions}回で${sessionGoal}回`}
              </p>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-surface-soft">
              <div
                className="fitall-grow-x h-full rounded-full bg-accent"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="fitall-card p-4">
            <p className="text-base font-medium text-ink-muted">平均単価</p>
            <p className="mt-2 whitespace-nowrap text-xl font-black text-ink">{yen(averageTicket)}</p>
            <p className="mt-1 text-base font-bold text-brand">1チケットあたり</p>
          </div>
          <div className="fitall-card p-4">
            <p className="text-base font-medium text-ink-muted">先月の売上</p>
            <p className="mt-2 whitespace-nowrap text-xl font-black text-ink">{yen(prevTotal)}</p>
            <p className="mt-1 text-base font-bold text-brand">比較用</p>
          </div>
        </div>

        <div className="fitall-card p-4">
          <div className="mb-3">
            <h2 className="font-bold text-ink">6ヶ月の流れ</h2>
            <p className="mt-1 text-base font-bold text-brand">水色の棒が月ごとの売上です</p>
          </div>
          <SalesBarChart data={monthlySalesData} />
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-ink">今月の明細</h2>
            <span className="text-base font-medium text-ink-muted">{records.length}件</span>
          </div>

          {!records.length ? (
            <div className="rounded-card border border-dashed border-line bg-white p-6 text-center text-base font-medium text-ink-muted">
              今月の売上はまだありません
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((record, index) => (
                <div
                  key={record.id}
                  className="fitall-card fitall-card-pop grid grid-cols-[40px_1fr] items-center gap-3 p-3"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-base font-bold text-ink">
                    {record.quantity}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">{record.name}</h3>
                    <p className="mt-0.5 text-base font-medium text-ink-muted">
                      {new Date(record.date).toLocaleDateString('ja-JP')} / {record.quantity}回チケット
                    </p>
                  </div>
                  <div className="col-span-2 border-t border-line pt-2">
                    <p className="text-base font-black text-ink">{yen(record.amount)}</p>
                    <p className="text-base font-bold text-brand">支払済</p>
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
            <p className="fitall-kicker">売上</p>
            <h1 className="fitall-desktop-title">売上管理</h1>
            <p className="mt-2 text-base font-medium text-ink-muted">
              PCでは月次売上、販売回数、明細をまとめて確認できます。
            </p>
          </div>
          <div className="fitall-pill fitall-pill-aqua">{now.getMonth() + 1}月</div>
        </header>

        {preview && (
          <div className="fitall-desktop-card mb-5 bg-accent-soft px-5 py-3 text-base font-bold text-brand">
            開発用UI確認モードです。売上データはサンプルです。
          </div>
        )}

        <section className="grid grid-cols-[1.4fr_.8fr_.8fr] gap-4">
          <div className="fitall-desktop-card border-ink">
            <div className="bg-accent px-5 py-4 text-ink">
              <p className="text-base font-bold text-ink/70">今月</p>
              <p className="mt-1 text-lg font-black">{now.getMonth() + 1}月の売上</p>
            </div>
            <div className="p-6">
              <p className="text-base font-medium text-ink-muted">いま入っている金額</p>
              <h2 className="mt-2 text-6xl font-black leading-none text-ink">{yen(currentTotal)}</h2>
              <p className={`mt-3 text-base font-black ${diff >= 0 ? 'text-brand' : 'text-danger'}`}>
                先月比 {diff >= 0 ? '+' : '-'}{yen(Math.abs(diff))} / {diffRate >= 0 ? '+' : ''}{diffRate}%
              </p>
            </div>
          </div>

          <div className="fitall-desktop-card p-5">
            <p className="fitall-kicker">販売数</p>
            <p className="mt-4 text-5xl font-black text-ink">{currentSoldSessions}<span className="ml-1 text-base">回</span></p>
            <p className="mt-2 text-base font-medium text-ink-muted">販売回数</p>
          </div>

          <div className="fitall-desktop-card p-5">
            <p className="fitall-kicker">平均</p>
            <p className="mt-4 text-4xl font-black text-ink">{yen(averageTicket)}</p>
            <p className="mt-2 text-base font-medium text-ink-muted">平均単価</p>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-[1.15fr_.85fr] gap-4">
          <div className="fitall-desktop-card p-5">
            <div className="mb-4">
              <h2 className="fitall-section-title">6ヶ月の流れ</h2>
              <p className="mt-1 text-base font-bold text-brand">水色の棒が月ごとの売上です</p>
            </div>
            <SalesBarChart data={monthlySalesData} />
          </div>

          <div className="fitall-desktop-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="fitall-section-title">今月の明細</h2>
              <span className="text-base font-medium text-ink-muted">{records.length}件</span>
            </div>
            {!records.length ? (
              <div className="rounded-card border border-dashed border-line bg-white p-6 text-center text-base font-medium text-ink-muted">
                今月の売上はまだありません
              </div>
            ) : (
              <div className="divide-y divide-line">
                {records.map((record) => (
                  <div key={record.id} className="grid grid-cols-[40px_1fr_auto] items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-base font-bold text-ink">
                      {record.quantity}
                    </div>
                    <div>
                      <p className="text-base font-bold text-ink">{record.name}</p>
                      <p className="mt-0.5 text-base font-medium text-ink-muted">
                        {new Date(record.date).toLocaleDateString('ja-JP')} / {record.quantity}回
                      </p>
                    </div>
                    <p className="text-base font-black text-ink">{yen(record.amount)}</p>
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

  const sixMonthsAgoKey = addMonthsToDateKey(todayKey, -5)
  const { start: sixMonthsAgo } = jstMonthBounds(sixMonthsAgoKey)
  const { end: monthEnd } = jstMonthBounds(currentMonthKey)
  let revenue
  try {
    revenue = await loadTrainerRevenue(supabase, trainerIdsForQuery, sixMonthsAgo.toISOString(), monthEnd.toISOString())
  } catch (error) {
    return (
      <div className="fitall-page fitall-page-pad space-y-4 py-5">
        <h1 className="text-[17px] font-black text-ink">売上管理</h1>
        <p role="status" className="fitall-card p-4 text-base leading-relaxed">{trainerRevenueErrorMessage(error)}</p>
      </div>
    )
  }
  const allRecords = revenue.filter(r => Date.parse(r.paid_at) <= monthEnd.getTime())
  const currentRecords = allRecords.filter(r => Date.parse(r.paid_at) >= monthStart.getTime())
  const prevRecords = allRecords.filter(r => Date.parse(r.paid_at) >= prevMonthStart.getTime()
    && Date.parse(r.paid_at) <= prevMonthEnd.getTime())
  const currentTotal = currentRecords.reduce((sum, r) => sum + r.amount, 0)
  const prevTotal = prevRecords.reduce((sum, r) => sum + r.amount, 0)
  const currentSoldSessions = currentRecords.reduce((sum, r) => sum + r.quantity, 0)

  const bookingIds = currentRecords.map(r => r.booking_id).filter((id): id is string => !!id)
  const { data: bookings } = bookingIds.length
    ? await supabase.from('bookings').select('id, trainee_id').in('id', bookingIds)
    : { data: [] }
  const bookingMap = Object.fromEntries((bookings ?? []).map(b => [b.id, b]))
  const traineeMap = await loadTraineeNameMap(supabase, [
    ...currentRecords.map(r => r.trainee_id).filter((id): id is string => !!id),
    ...(bookings ?? []).map(b => b.trainee_id),
  ])

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

  const recordViews: SalesRecordView[] = currentRecords.map(record => {
    const traineeId = record.trainee_id ?? (record.booking_id ? bookingMap[record.booking_id]?.trainee_id : null)
    return {
      id: record.id,
      name: traineeId ? traineeMap[traineeId] ?? '不明' : '不明',
      amount: record.amount,
      date: record.paid_at,
      quantity: record.quantity,
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
