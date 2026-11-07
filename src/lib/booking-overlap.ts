import { readBookingInterval } from './booking-interval'
import type { SupabaseClient } from '@supabase/supabase-js'
import { readTrainerSettingsFromBio } from './trainer-settings'

type SupabaseLike = {
  from: SupabaseClient['from']
}

export interface BookingOverlapResult {
  overlaps: boolean
  bookingId?: string
  scheduledAt?: string
  sessionMs: number
}

export async function findTrainerBookingOverlap(input: {
  supabase: SupabaseLike
  trainerId: string
  trainerBio?: string | null
  scheduledAt: string
  excludeBookingId?: string | null
}): Promise<BookingOverlapResult> {
  const scheduledDate = new Date(input.scheduledAt)
  if (Number.isNaN(scheduledDate.getTime())) {
    return { overlaps: false, sessionMs: 60 * 60 * 1000 }
  }

  const settings = readTrainerSettingsFromBio(input.trainerBio)
  let sessionMs = settings.session_duration_minutes * 60 * 1000
  if (input.excludeBookingId) {
    const { data, error } = await input.supabase.from('bookings')
      .select('occupied_range').eq('trainer_id', input.trainerId).eq('id', input.excludeBookingId).maybeSingle()
    if (error || !data) throw new Error('Booking duration lookup failed')
    const interval = readBookingInterval(data.occupied_range)
    sessionMs = interval.end.getTime() - interval.start.getTime()
  }
  const scheduledStart = scheduledDate.getTime()
  const scheduledEnd = scheduledStart + sessionMs

  let query = input.supabase
    .from('bookings')
    .select('id, scheduled_at')
    .eq('trainer_id', input.trainerId)
    .in('status', ['pending', 'confirmed', 'completed'])
    .overlaps('occupied_range', `[${new Date(scheduledStart).toISOString()},${new Date(scheduledEnd).toISOString()})`)
    .limit(1)

  if (input.excludeBookingId) {
    query = query.neq('id', input.excludeBookingId)
  }

  const { data, error } = await query
  if (error) throw new Error('Booking overlap lookup failed')
  const overlap = data?.[0]

  return overlap
    ? { overlaps: true, bookingId: overlap.id, scheduledAt: overlap.scheduled_at, sessionMs }
    : { overlaps: false, sessionMs }
}
