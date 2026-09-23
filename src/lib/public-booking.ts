import { createAdminSupabaseClient } from './supabase-admin'
import { loadActiveBookingHoldIntervals } from './booking-holds'
import {
  addDaysToDateKey,
  dayOfWeekForDateKey,
  formatJstDateKey,
  formatJstDateTime,
  parseJstDateTime,
} from './datetime'
import {
  getPlanSettings,
  readTrainerPlanSettingsFromBio,
  readTrainerSettingsFromBio,
  type TrainerPlanBillingType,
} from './trainer-settings'

const PUBLIC_BOOKING_SLOT_INTERVAL_MINUTES = 60
const PUBLIC_BOOKING_LOOKAHEAD_DAYS = 28

export interface PublicBookingMenu {
  id: string
  name: string
  price: number
  sessions: number
  billing_type: TrainerPlanBillingType
  description: string
}

export interface PublicBookingSlot {
  value: string
  label: string
}

export interface PublicBookingData {
  trainer: {
    profileId: string
    userId: string
    name: string
  }
  menus: PublicBookingMenu[]
  slots: PublicBookingSlot[]
}

function timeToMinutes(time: string) {
  const [h, m] = time.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatSlotLabel(date: Date) {
  return formatJstDateTime(date, {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isMissingSlotDateColumnError(error: { message?: string; code?: string } | null) {
  const message = error?.message ?? ''
  return error?.code === 'PGRST204' || message.includes("'slot_date' column")
}

function inferBillingType(name: string, sessions: number): TrainerPlanBillingType {
  if (name.includes('月') || name.includes('月謝')) return 'monthly'
  return sessions > 1 ? 'ticket' : 'ticket'
}

export async function getPublicBookingData(trainerProfileId: string): Promise<PublicBookingData | null> {
  const supabase = createAdminSupabaseClient()

  const { data: profile } = await supabase
    .from('trainer_profiles')
    .select('id, user_id, bio')
    .eq('id', trainerProfileId)
    .maybeSingle()

  if (!profile) return null

  const { data: trainerUser } = await supabase
    .from('users')
    .select('name')
    .eq('id', profile.user_id)
    .maybeSingle()

  const { data: planRows } = await supabase
    .from('plans')
    .select('id, name, price, sessions')
    .eq('trainer_id', profile.id)
    .order('created_at')

  const settings = readTrainerSettingsFromBio(profile.bio)
  const planSettings = readTrainerPlanSettingsFromBio(profile.bio)
  const menus = (planRows ?? [])
    .map((p, index) => {
      const meta = getPlanSettings(planSettings, p.id, {
        billing_type: inferBillingType(p.name, p.sessions ?? 1),
        sort_order: index,
      })
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        sessions: p.sessions ?? 1,
        billing_type: meta.billing_type,
        description: meta.description,
        is_public: meta.is_public,
        sort_order: meta.sort_order || index,
      }
    })
    .filter((p) => p.is_public && p.billing_type === 'ticket')
    .sort((a, b) => a.sort_order - b.sort_order)
  const now = new Date()
  const todayKey = formatJstDateKey(now)
  const rangeEndKey = addDaysToDateKey(todayKey, PUBLIC_BOOKING_LOOKAHEAD_DAYS)
  const rangeEnd = parseJstDateTime(rangeEndKey, '23:59:59')

  let availability: { slot_date: string; start_time: string; end_time: string }[] = []
  const { data: datedRows, error: datedError } = await supabase
    .from('trainer_availability')
    .select('slot_date, start_time, end_time')
    .eq('trainer_id', profile.id)
    .gte('slot_date', todayKey)
    .lte('slot_date', rangeEndKey)
    .order('slot_date')

  if (isMissingSlotDateColumnError(datedError)) {
    const { data: weeklyRows } = await supabase
      .from('trainer_availability')
      .select('day_of_week, start_time, end_time')
      .eq('trainer_id', profile.id)

    for (let i = 0; i <= PUBLIC_BOOKING_LOOKAHEAD_DAYS; i += 1) {
      const slotDate = addDaysToDateKey(todayKey, i)
      const row = (weeklyRows ?? []).find((r) => r.day_of_week === dayOfWeekForDateKey(slotDate))
      if (!row) continue
      availability.push({
        slot_date: slotDate,
        start_time: row.start_time,
        end_time: row.end_time,
      })
    }
  } else {
    availability = datedRows ?? []
    if (!availability.length) {
      const { data: weeklyRows } = await supabase
        .from('trainer_availability')
        .select('day_of_week, start_time, end_time')
        .eq('trainer_id', profile.id)
        .not('day_of_week', 'is', null)

      for (let i = 0; i <= PUBLIC_BOOKING_LOOKAHEAD_DAYS; i += 1) {
        const slotDate = addDaysToDateKey(todayKey, i)
        const row = (weeklyRows ?? []).find((r) => r.day_of_week === dayOfWeekForDateKey(slotDate))
        if (!row) continue
        availability.push({
          slot_date: slotDate,
          start_time: row.start_time,
          end_time: row.end_time,
        })
      }
    }
  }

  const sessionMs = settings.session_duration_minutes * 60 * 1000
  const { data: bookings } = await supabase
    .from('bookings')
    .select('scheduled_at')
    .eq('trainer_id', profile.id)
    .in('status', ['pending', 'confirmed', 'completed'])
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', rangeEnd.toISOString())

  const bookedIntervals = (bookings ?? []).map((booking) => {
    const start = new Date(booking.scheduled_at)
    const end = new Date(start.getTime() + sessionMs)
    return { start, end }
  })
  const holdIntervals = await loadActiveBookingHoldIntervals({
    supabase,
    trainerId: profile.id,
    from: now.toISOString(),
    to: rangeEnd.toISOString(),
    sessionMs,
  })
  const unavailableIntervals = [...bookedIntervals, ...holdIntervals]
  const slots: PublicBookingSlot[] = []

  for (const row of availability) {
    const start = Math.max(timeToMinutes(row.start_time), timeToMinutes(settings.business_open))
    const end = Math.min(timeToMinutes(row.end_time), timeToMinutes(settings.business_close))
    for (
      let minute = start;
      minute + settings.session_duration_minutes <= end;
      minute += PUBLIC_BOOKING_SLOT_INTERVAL_MINUTES
    ) {
      const slotDate = parseJstDateTime(row.slot_date, minutesToTime(minute))
      if (slotDate <= now) continue
      const slotEnd = new Date(slotDate.getTime() + settings.session_duration_minutes * 60 * 1000)
      const value = slotDate.toISOString()
      const overlaps = unavailableIntervals.some(
        (booking) => slotDate < booking.end && slotEnd > booking.start
      )
      if (overlaps) continue
      slots.push({ value, label: formatSlotLabel(slotDate) })
    }
  }

  return {
    trainer: {
      profileId: profile.id,
      userId: profile.user_id,
      name: trainerUser?.name ?? 'トレーナー',
    },
    menus,
    slots,
  }
}

export async function isPublicSlotAvailable(trainerProfileId: string, scheduledAt: string) {
  const data = await getPublicBookingData(trainerProfileId)
  return !!data?.slots.some((slot) => slot.value === scheduledAt)
}
