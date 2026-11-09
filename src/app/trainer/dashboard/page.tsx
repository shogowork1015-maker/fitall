import { loadTrainerRevenue, trainerRevenueErrorMessage } from '@/lib/trainer-revenue'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { loadTraineeNameMap } from '@/lib/trainee-display'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'
import { readTrainerSettingsFromBio } from '@/lib/trainer-settings'
import { loadTicketSummaries, loadVisitedTrainees } from '@/lib/ticket-summary'
import { TrainerHomeMobile } from './TrainerHomeMobile'
import {
  formatJstDate,
  formatJstDateKey,
  jstDayBounds,
  jstMonthBounds,
  parseJstDateTime,
} from '@/lib/datetime'

type DashboardBooking = {
  id: string
  scheduled_at: string
  status: string
  trainee_id: string
  trainee_name: string
  price?: number | null
  remaining?: number | null
  first_time?: boolean
}

// ホーム画面。データの取得はこのファイルで行い、見た目は TrainerHomeMobile に任せる
function DashboardScreen(props: {
  monthLabel: string
  todayLabel: string
  totalSales: number | null
  salesError?: string
  clientCount: number
  pendingCount: number
  todayBookings: DashboardBooking[]
  sessionMinutes?: number
  closeTime?: string
  preview?: boolean
}) {
  return <TrainerHomeMobile {...props} />
}

export default async function TrainerDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const devAuthBypass = isDevAuthBypassEnabled()

  if (!user && !devAuthBypass) redirect('/auth/login')

  const todayKey = formatJstDateKey()
  const dayStart = parseJstDateTime(todayKey, '00:00')
  // 「11月8日 日曜日」のように、日付と曜日のあいだを空ける
  const todayLabel = `${formatJstDate(dayStart, { month: 'long', day: 'numeric' })} ${formatJstDate(dayStart, { weekday: 'long' })}`
  const monthLabel = `${formatJstDate(parseJstDateTime(todayKey, '00:00'), { month: 'numeric' })}の実績`

  if (!user && devAuthBypass) {
    return (
      <DashboardScreen
        monthLabel={monthLabel}
        todayLabel={todayLabel}
        totalSales={128000}
        clientCount={12}
        pendingCount={1}
        todayBookings={[
          {
            id: 'preview-1',
            scheduled_at: parseJstDateTime(todayKey, '10:00').toISOString(),
            status: 'confirmed',
            trainee_id: 'preview-client-1',
            trainee_name: '佐藤 美咲',
            price: 8800,
            remaining: 2,
          },
          {
            id: 'preview-2',
            scheduled_at: parseJstDateTime(todayKey, '13:00').toISOString(),
            status: 'pending',
            trainee_id: 'preview-client-2',
            trainee_name: '田中 健太',
            price: 8800,
            first_time: true,
          },
          {
            id: 'preview-3',
            scheduled_at: parseJstDateTime(todayKey, '18:00').toISOString(),
            status: 'confirmed',
            trainee_id: 'preview-client-3',
            trainee_name: '山本 結衣',
            price: 8000,
            remaining: 1,
          },
        ]}
        preview
      />
    )
  }

  const { data: myTrainerProfile } = await supabase
    .from('trainer_profiles')
    .select('id, bio')
    .eq('user_id', user!.id)
    .maybeSingle()
  const settings = readTrainerSettingsFromBio(myTrainerProfile?.bio)

  const trainerIdsForQuery = [user!.id, myTrainerProfile?.id].filter(Boolean) as string[]

  const { start: todayStart, end: todayEnd } = jstDayBounds(todayKey)
  const { start: monthStart } = jstMonthBounds(todayKey)

  const { data: todayBookings } = await supabase
    .from('bookings')
    .select('id, scheduled_at, status, trainee_id, price')
    .in('trainer_id', trainerIdsForQuery)
    .gte('scheduled_at', todayStart.toISOString())
    .lte('scheduled_at', todayEnd.toISOString())
    .order('scheduled_at')

  const traineeMap = await loadTraineeNameMap(
    supabase,
    (todayBookings ?? []).map((b) => b.trainee_id)
  )
  // 予約ごとに「チケット残り2回」「はじめて」を出すため、お客様のチケットと来店歴を読む
  const todayTraineeIds = (todayBookings ?? []).map((b) => b.trainee_id)
  const tickets = await loadTicketSummaries(supabase, trainerIdsForQuery, todayTraineeIds)
  const visited = await loadVisitedTrainees(supabase, trainerIdsForQuery, todayTraineeIds)

  const { end: monthEnd } = jstMonthBounds(todayKey)
  let totalSales: number | null = null
  let salesError: string | undefined
  try {
    const salesData = await loadTrainerRevenue(supabase, trainerIdsForQuery, monthStart.toISOString(), monthEnd.toISOString())
    totalSales = salesData.reduce((sum, r) => sum + r.amount, 0)
  } catch (error) {
    salesError = trainerRevenueErrorMessage(error)
  }

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

  return (
    <DashboardScreen
      monthLabel={monthLabel}
      todayLabel={todayLabel}
      totalSales={totalSales}
      salesError={salesError}
      clientCount={clientCount ?? 0}
      pendingCount={pendingCount ?? 0}
      todayBookings={(todayBookings ?? []).map((booking) => ({
        ...booking,
        trainee_name: traineeMap[booking.trainee_id] ?? '不明',
        remaining: tickets[booking.trainee_id]?.remaining ?? null,
        first_time: !visited.has(booking.trainee_id),
      }))}
      sessionMinutes={settings.session_duration_minutes}
      closeTime={settings.business_close}
    />
  )
}
