import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TrainerBookingCalendar } from './TrainerBookingCalendar'

export default async function TrainerBookingsPage() {
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

  if (!trainerProfile) {
    return (
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0A0A0A]">
          予約管理
        </h1>
        <div className="mt-4 bg-white rounded-[20px] p-6 text-center text-sm text-[#9CA3AF] border border-[#E5E7EB]">
          トレーナープロフィールが見つかりません
        </div>
      </div>
    )
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, scheduled_at, trainee_id, price, status')
    .eq('trainer_id', trainerProfile.id)
    .in('status', ['pending', 'confirmed', 'completed'])
    .order('scheduled_at')

  const allIds = [
    ...new Set([
      ...(bookings ?? []).map((b) => b.trainee_id),
    ]),
  ]

  const { data: trainees } = allIds.length
    ? await supabase.from('users').select('id, name').in('id', allIds)
    : { data: [] }

  const traineeMap = Object.fromEntries(
    (trainees ?? []).map((t) => [t.id, t.name])
  )

  const calendarBookings = (bookings ?? []).map((b) => ({
    id: b.id,
    scheduled_at: b.scheduled_at,
    trainee_id: b.trainee_id,
    trainee_name: traineeMap[b.trainee_id] ?? '不明',
    price: b.price,
    status: b.status as 'pending' | 'confirmed' | 'completed' | 'cancelled',
  }))

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0A0A0A]">
          予約管理
        </h1>
        <Link
          href="/trainer/availability"
          className="text-xs font-semibold text-[#0066FF] flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          空き時間設定
        </Link>
      </div>
      <TrainerBookingCalendar bookings={calendarBookings} />
    </div>
  )
}
