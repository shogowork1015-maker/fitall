import { loadTrainerRevenue, trainerRevenueErrorMessage } from '@/lib/trainer-revenue'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
type MonthlySales = { month: string; amount: number }
import { loadTraineeNameMap } from '@/lib/trainee-display'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'
import { loadPurchasePlanNames } from '@/lib/ticket-summary'
import { Screen, Note } from '@/ui/Screen'
import { Section, Banner, Empty } from '@/ui/List'
import { Hero, Bars, Stats } from '@/ui/Hero'
import { DateList, DateRow } from '@/ui/DateList'
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
  /** 売れたメニューの名前（例：4回チケット） */
  planName?: string | null
}

function yen(amount: number) {
  return `¥${amount.toLocaleString()}`
}

function monthLabel(dateKeyOrValue: string | Date) {
  return formatJstDate(dateKeyOrValue, { month: 'numeric' })
}

// 売上タブ（A案）。
// 主役：今月の売上。6か月の流れを大きな棒で（今月だけアクア）、その下に数字の帯と明細
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
  const diffRate = prevTotal > 0 ? Math.round((diff / prevTotal) * 100) : null
  const averageTicket = currentSoldSessions > 0 ? Math.round(currentTotal / currentSoldSessions) : null

  return (
    <Screen caption={monthLabel(now)} title="売上">
      <Hero
        value={yen(currentTotal)}
        note={prevTotal > 0
          ? <>先月より <b>{diff >= 0 ? '+' : '−'}{yen(Math.abs(diff))}</b>（{diffRate !== null && diffRate >= 0 ? '+' : ''}{diffRate}%）</>
          : '先月の売上はありません'}
      />
      <Bars data={monthlySalesData.map((item) => ({ label: item.month, value: item.amount }))} />
      <Stats items={[
        { label: '販売', value: `${currentSoldSessions}回` },
        { label: '1回あたり', value: averageTicket === null ? '—' : yen(averageTicket) },
        { label: '先月', value: yen(prevTotal) },
      ]} />

      <Section title="今月の明細" action={records.length ? `${records.length}件` : undefined}>
        {records.length ? (
          <DateList>
            {records.map((record) => (
              <DateRow
                key={record.id}
                small
                day={formatJstDate(record.date, { month: 'numeric', day: 'numeric' })}
                sub={formatJstDate(record.date, { weekday: 'short' })}
                title={record.name}
                meta={record.planName || `${record.quantity}回分`}
                right={yen(record.amount)}
                strongRight
              />
            ))}
          </DateList>
        ) : <Empty>今月の売上はまだありません</Empty>}
      </Section>

      {preview ? <Note>確認モード（サンプルの売上）</Note> : null}
    </Screen>
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
      { month: '6月', amount: 66000 },
      { month: '7月', amount: 78000 },
      { month: '8月', amount: 92000 },
      { month: '9月', amount: 85000 },
      { month: '10月', amount: 104000 },
      { month: '11月', amount: 128000 },
    ]
    // サンプルの明細は、今日・2日前・3日前に並べる
    const daysAgo = (days: number) => new Date(now.getTime() - days * 86400000).toISOString()
    const records = [
      { id: 'r1', name: '佐藤 美咲', amount: 32000, date: now.toISOString(), quantity: 4, planName: '4回チケット' },
      { id: 'r2', name: '鈴木 大輔', amount: 30000, date: daysAgo(2), quantity: 4, planName: '月謝（4回）' },
      { id: 'r3', name: '山本 結衣', amount: 8800, date: daysAgo(3), quantity: 1, planName: 'パーソナル60分' },
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
      <Screen title="売上">
        <Banner>{trainerRevenueErrorMessage(error)}</Banner>
      </Screen>
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

  // チケットの購入は、買ったメニューの名前を出す
  const planNames = await loadPurchasePlanNames(supabase, currentRecords
    .filter(r => r.id.startsWith('purchase:'))
    .map(r => r.id.slice('purchase:'.length)))

  const recordViews: SalesRecordView[] = currentRecords.map(record => {
    const traineeId = record.trainee_id ?? (record.booking_id ? bookingMap[record.booking_id]?.trainee_id : null)
    return {
      id: record.id,
      name: traineeId ? traineeMap[traineeId] ?? '不明' : '不明',
      amount: record.amount,
      date: record.paid_at,
      quantity: record.quantity,
      planName: record.id.startsWith('purchase:') ? planNames[record.id.slice('purchase:'.length)] ?? null : null,
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
