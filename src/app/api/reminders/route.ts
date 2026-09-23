import { NextRequest, NextResponse } from 'next/server'
import { sendBookingReminderNotifications } from '@/lib/booking-notifications'
import { addDaysToDateKey, formatJstDateKey, jstDayBounds } from '@/lib/datetime'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  // Vercel Cron の認証チェック
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Cron is not configured' }, { status: 503 })
  }
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminSupabaseClient()

  // 翌日の確定済み予約をJST基準で取得
  const tomorrowKey = addDaysToDateKey(formatJstDateKey(), 1)
  const { start: dayStart, end: dayEnd } = jstDayBounds(tomorrowKey)

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, scheduled_at, trainee_id, trainer_id')
    .eq('status', 'confirmed')
    .gte('scheduled_at', dayStart.toISOString())
    .lte('scheduled_at', dayEnd.toISOString())

  if (error) {
    console.error('[reminders] fetch error:', error)
    return NextResponse.json({ error: 'Reminder fetch failed' }, { status: 500 })
  }

  if (!bookings?.length) {
    return NextResponse.json({ sent: 0 })
  }

  // trainee_id は新しい公開予約では trainee_profiles.id、古い予約では users.id の可能性がある
  const bookingTraineeIds = [...new Set(bookings.map((b) => b.trainee_id))]
  const trainerProfileIds = [...new Set(bookings.map((b) => b.trainer_id))]

  const { data: directTraineeUsers } = await supabase
    .from('users')
    .select('id, name, email, line_user_id')
    .in('id', bookingTraineeIds)

  const directTraineeMap = Object.fromEntries(
    (directTraineeUsers ?? []).map((u) => [u.id, u])
  )
  const missingTraineeIds = bookingTraineeIds.filter((id) => !directTraineeMap[id])

  const { data: traineeProfiles } = missingTraineeIds.length
    ? await supabase
        .from('trainee_profiles')
        .select('id, user_id')
        .in('id', missingTraineeIds)
    : { data: [] }

  const profileUserIds = [...new Set((traineeProfiles ?? []).map((p) => p.user_id))]
  const { data: profileTraineeUsers } = profileUserIds.length
    ? await supabase.from('users').select('id, name, email, line_user_id').in('id', profileUserIds)
    : { data: [] }

  const profileUserMap = Object.fromEntries(
    (profileTraineeUsers ?? []).map((u) => [u.id, u])
  )
  const traineeProfileMap = Object.fromEntries(
    (traineeProfiles ?? []).map((p) => [p.id, profileUserMap[p.user_id]])
  )
  const traineeMap = { ...directTraineeMap, ...traineeProfileMap }

  const { data: trainerProfiles } = await supabase
    .from('trainer_profiles')
    .select('id, user_id')
    .in('id', trainerProfileIds)

  const trainerUserIds = (trainerProfiles ?? []).map((p) => p.user_id)
  const { data: trainerUsers } = trainerUserIds.length
    ? await supabase.from('users').select('id, name, email, line_user_id').in('id', trainerUserIds)
    : { data: [] }

  const trainerProfileToUser = Object.fromEntries(
    (trainerProfiles ?? []).map((p) => [p.id, p.user_id])
  )
  const trainerUserMap = Object.fromEntries((trainerUsers ?? []).map((u) => [u.id, u]))

  let sent = 0

  for (const booking of bookings) {
    const trainee = traineeMap[booking.trainee_id]
    const trainerUserId = trainerProfileToUser[booking.trainer_id]
    const trainerUser = trainerUserId ? trainerUserMap[trainerUserId] : null
    const result = await sendBookingReminderNotifications({
      scheduledAt: booking.scheduled_at,
      customer: trainee,
      trainer: trainerUser,
    })
    sent += result.sent
  }

  return NextResponse.json({ sent, bookings: bookings.length })
}
