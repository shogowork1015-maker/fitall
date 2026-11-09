import { createServerSupabaseClient } from '@/lib/supabase-server'
import { addDaysToDateKey, formatJstDateKey, parseJstDateTime } from '@/lib/datetime'
import { redirect } from 'next/navigation'
import { TrainerBookings } from './TrainerBookings'
import { loadTraineeNameMap } from '@/lib/trainee-display'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'
import { Screen } from '@/ui/Screen'
import { Section, Row } from '@/ui/List'
import { readTrainerSettingsFromBio } from '@/lib/trainer-settings'
import { loadTicketSummaries, loadVisitedTrainees } from '@/lib/ticket-summary'

function atTime(dayOffset: number, time: string) {
  return parseJstDateTime(addDaysToDateKey(formatJstDateKey(), dayOffset), time).toISOString()
}

// 確認モードのサンプル（見本の画像と同じ並び）。DBには触らない
function mockCalendarData() {
  const base = { price: 8800, status: 'confirmed' as const, credit_status: 'scheduled' }
  const sato = { trainee_id: 'preview-client-1', trainee_name: '佐藤 美咲', remaining: 2 }
  const tanaka = { trainee_id: 'preview-client-2', trainee_name: '田中 健太', remaining: 0 }
  const yamamoto = { trainee_id: 'preview-client-3', trainee_name: '山本 結衣', remaining: 1 }
  const suzuki = { trainee_id: 'preview-client-4', trainee_name: '鈴木 大輔', remaining: 5 }

  return {
    bookings: [
      { ...base, ...sato, id: 'preview-booking-1', scheduled_at: atTime(0, '10:00') },
      { ...base, ...tanaka, id: 'preview-booking-2', scheduled_at: atTime(0, '13:00'), status: 'pending' as const, credit_status: null, first_time: true },
      { ...base, ...yamamoto, id: 'preview-booking-3', scheduled_at: atTime(0, '18:00'), price: 8000 },
      { ...base, ...suzuki, id: 'preview-booking-4', scheduled_at: atTime(1, '11:00') },
      { ...base, ...sato, id: 'preview-booking-5', scheduled_at: atTime(2, '10:00') },
      { ...base, ...suzuki, id: 'preview-booking-6', scheduled_at: atTime(2, '19:00') },
      { ...base, ...yamamoto, id: 'preview-booking-7', scheduled_at: atTime(4, '18:00'), price: 8000 },
      { ...base, ...sato, id: 'preview-booking-8', scheduled_at: atTime(5, '10:00') },
      { ...base, ...suzuki, id: 'preview-booking-9', scheduled_at: atTime(5, '15:00') },
      { ...base, ...sato, id: 'preview-booking-0', scheduled_at: atTime(-5, '18:00'), status: 'completed' as const, credit_status: 'used' },
    ],
    clients: [
      { trainee_id: 'preview-client-1', name: '佐藤 美咲' },
      { trainee_id: 'preview-client-2', name: '田中 健太' },
      { trainee_id: 'preview-client-3', name: '山本 結衣' },
      { trainee_id: 'preview-client-4', name: '鈴木 大輔' },
    ],
    menus: [
      { id: 'preview-menu-1', name: '通常セッション', price: 8800 },
      { id: 'preview-menu-4', name: '4回チケット', price: 32000 },
    ],
  }
}

export default async function TrainerBookingsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const devAuthBypass = isDevAuthBypassEnabled()

  if (!user && !devAuthBypass) redirect('/auth/login')

  if (!user && devAuthBypass) {
    const mock = mockCalendarData()
    return <TrainerBookings bookings={mock.bookings} clients={mock.clients} menus={mock.menus} preview />
  }

  const { data: trainerProfile } = await supabase
    .from('trainer_profiles')
    .select('id, price_per_session, bio')
    .eq('user_id', user!.id)
    .maybeSingle()

  if (!trainerProfile) {
    return (
      <Screen title="予約">
        <Section group footer="設定画面でプロフィールを作成すると、予約を管理できます。">
          <Row title="トレーナープロフィールが見つかりません" />
        </Section>
      </Screen>
    )
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, scheduled_at, trainee_id, price, status')
    .eq('trainer_id', trainerProfile.id)
    .in('status', ['pending', 'confirmed', 'completed'])
    .order('scheduled_at')

  const traineeMap = await loadTraineeNameMap(
    supabase,
    (bookings ?? []).map((b) => b.trainee_id)
  )

  const bookingIds = (bookings ?? []).map((b) => b.id)
  const { data: credits } = bookingIds.length
    ? await supabase
        .from('session_credits')
        .select('booking_id, status')
        .in('booking_id', bookingIds)
    : { data: [] }
  const creditByBooking = Object.fromEntries(
    (credits ?? []).map((c) => [c.booking_id, c.status])
  )

  // 予約ごとに「残り2回」「はじめて」を出すため、お客様のチケットと来店歴を読む
  const bookedTraineeIds = (bookings ?? []).map((b) => b.trainee_id)
  const tickets = await loadTicketSummaries(supabase, [trainerProfile.id], bookedTraineeIds)
  const visited = await loadVisitedTrainees(supabase, [trainerProfile.id], bookedTraineeIds)
  const settings = readTrainerSettingsFromBio(trainerProfile.bio)

  const calendarBookings = (bookings ?? []).map((b) => ({
    id: b.id,
    scheduled_at: b.scheduled_at,
    trainee_id: b.trainee_id,
    trainee_name: traineeMap[b.trainee_id] ?? '不明',
    price: b.price,
    status: b.status as 'pending' | 'confirmed' | 'completed' | 'cancelled',
    credit_status: creditByBooking[b.id] ?? null,
    remaining: tickets[b.trainee_id]?.remaining ?? null,
    first_time: !visited.has(b.trainee_id),
  }))

  const { data: activeRelations } = await supabase
    .from('trainer_trainee')
    .select('trainee_id')
    .eq('trainer_id', trainerProfile.id)
    .eq('status', 'active')
  const traineeProfileIds = (activeRelations ?? []).map((r) => r.trainee_id).filter(Boolean)
  const { data: traineeProfiles } = traineeProfileIds.length
    ? await supabase
        .from('trainee_profiles')
        .select('id, user_id')
        .in('id', traineeProfileIds)
    : { data: [] }
  const traineeUserIds = (traineeProfiles ?? []).map((t) => t.user_id).filter(Boolean)
  const { data: traineeUsers } = traineeUserIds.length
    ? await supabase.from('users').select('id, name').in('id', traineeUserIds)
    : { data: [] }
  const traineeUserNameMap = Object.fromEntries((traineeUsers ?? []).map((u) => [u.id, u.name]))
  const clientOptions = (traineeProfiles ?? []).map((profile) => ({
    trainee_id: profile.id,
    name: traineeUserNameMap[profile.user_id] ?? 'お客様',
  }))

  const { data: planRows } = await supabase
    .from('plans')
    .select('id, name, price')
    .eq('trainer_id', trainerProfile.id)
    .order('created_at')

  const menuOptions =
    planRows && planRows.length > 0
      ? planRows
      : [{ id: '', name: '通常セッション', price: trainerProfile.price_per_session ?? 0 }]

  return (
    <TrainerBookings
      bookings={calendarBookings}
      clients={clientOptions}
      menus={menuOptions}
      sessionMinutes={settings.session_duration_minutes}
      closeTime={settings.business_close}
    />
  )
}
