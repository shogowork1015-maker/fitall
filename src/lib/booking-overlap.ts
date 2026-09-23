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
  const sessionMs = settings.session_duration_minutes * 60 * 1000
  const scheduledStart = scheduledDate.getTime()
  const scheduledEnd = scheduledStart + sessionMs
  const rangeStart = new Date(scheduledStart - sessionMs)
  const rangeEnd = new Date(scheduledEnd + sessionMs)

  let query = input.supabase
    .from('bookings')
    .select('id, scheduled_at')
    .eq('trainer_id', input.trainerId)
    .in('status', ['pending', 'confirmed', 'completed'])
    .gte('scheduled_at', rangeStart.toISOString())
    .lte('scheduled_at', rangeEnd.toISOString())

  if (input.excludeBookingId) {
    query = query.neq('id', input.excludeBookingId)
  }

  const { data } = await query
  const overlap = (data ?? []).find((booking) => {
    const existingStart = new Date(booking.scheduled_at).getTime()
    const existingEnd = existingStart + sessionMs
    return scheduledStart < existingEnd && scheduledEnd > existingStart
  })

  return overlap
    ? { overlaps: true, bookingId: overlap.id, scheduledAt: overlap.scheduled_at, sessionMs }
    : { overlaps: false, sessionMs }
}
