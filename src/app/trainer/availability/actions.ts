'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { RECURRING_PRESET_WINDOW_DAYS } from '@/lib/booking-policy'
import {
  addDaysToDateKey,
  dayOfWeekForDateKey,
  formatJstDateKey,
  parseJstDateTime,
} from '@/lib/datetime'
import { attachFirstAvailableCreditForCustomerToBooking } from '@/lib/session-credits'
import { readTrainerSettingsFromBio } from '@/lib/trainer-settings'

export interface AvailabilitySlot {
  slot_date: string
  start_time: string
  end_time: string
}

export interface CreateTrainerReservationInput {
  trainee_id: string
  plan_id: string | null
  date: string
  start_time: string
  repeat_enabled: boolean
  repeat_start_date?: string
  repeat_until_date?: string
}

type ActionResult = { error?: string }
type ActionError = { error: string }

interface TrainerProfileLite {
  id: string
  price_per_session?: number | null
  bio?: string | null
}

function toActionError(label: string, message: string): ActionResult {
  return { error: `${label}: ${message}` }
}

function getDowFromDateKey(dateKey: string): number {
  return dayOfWeekForDateKey(dateKey)
}

function nextDateKeyForDayOfWeek(dayOfWeek: number): string {
  for (let i = 0; i < 7; i += 1) {
    const key = addDaysToDateKey(formatJstDateKey(), i)
    if (dayOfWeekForDateKey(key) === dayOfWeek) return key
  }
  return formatJstDateKey()
}

function isMissingSlotDateColumnError(error: { message?: string; code?: string } | null): boolean {
  const message = error?.message ?? ''
  return error?.code === 'PGRST204' || message.includes("'slot_date' column")
}

async function getAuthedTrainerProfile(
  needsPrice = false
): Promise<{ supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>; profile: TrainerProfileLite } | ActionError> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  if (needsPrice) {
    const { data: profile } = await supabase
      .from('trainer_profiles')
      .select('id, price_per_session, bio')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!profile) return { error: 'トレーナープロフィールが見つかりません' }
    return { supabase, profile }
  }

  const { data: profile } = await supabase
    .from('trainer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile) return { error: 'トレーナープロフィールが見つかりません' }
  return { supabase, profile }
}

function buildRowsByDate(trainerId: string, slots: AvailabilitySlot[]) {
  return slots.map((s) => ({
    trainer_id: trainerId,
    slot_date: s.slot_date,
    day_of_week: getDowFromDateKey(s.slot_date),
    start_time: s.start_time,
    end_time: s.end_time,
  }))
}

function buildLegacyRowsByDate(trainerId: string, slots: AvailabilitySlot[]) {
  const weeklyMap = new Map<number, { start_time: string; end_time: string }>()
  for (const s of slots) {
    weeklyMap.set(getDowFromDateKey(s.slot_date), {
      start_time: s.start_time,
      end_time: s.end_time,
    })
  }
  return Array.from(weeklyMap.entries()).map(([day_of_week, v]) => ({
    trainer_id: trainerId,
    day_of_week,
    start_time: v.start_time,
    end_time: v.end_time,
  }))
}

// 空き時間を全て上書き保存する
export async function saveAvailabilityAction(
  slots: AvailabilitySlot[]
): Promise<ActionResult> {
  const auth = await getAuthedTrainerProfile(false)
  if ('error' in auth) return auth
  const { supabase, profile } = auth

  // 既存レコードをすべて削除してから新規挿入
  const { error: deleteError } = await supabase
    .from('trainer_availability')
    .delete()
    .eq('trainer_id', profile.id)

  if (deleteError) {
    console.error('[saveAvailabilityAction] delete error:', deleteError)
    return toActionError('保存に失敗しました（削除）', deleteError.message)
  }

  if (slots.length > 0) {
    const rows = buildRowsByDate(profile.id, slots)
    const { error: insertError } = await supabase
      .from('trainer_availability')
      .insert(rows)

    if (insertError) {
      // 旧スキーマ（slot_date なし）向けフォールバック
      if (isMissingSlotDateColumnError(insertError)) {
        const legacyRows = buildLegacyRowsByDate(profile.id, slots)

        const { error: legacyInsertError } = await supabase
          .from('trainer_availability')
          .insert(legacyRows)

        if (legacyInsertError) {
          console.error('[saveAvailabilityAction] legacy insert error:', legacyInsertError)
          return toActionError('保存に失敗しました（登録）', legacyInsertError.message)
        }
      } else {
        console.error('[saveAvailabilityAction] insert error:', insertError)
        return toActionError('保存に失敗しました（登録）', insertError.message)
      }
    }
  }

  revalidatePath('/trainer/availability')
  return {}
}

export async function applyWeeklyPresetAction(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  mode: 'open' | 'block'
): Promise<ActionResult> {
  const auth = await getAuthedTrainerProfile(false)
  if ('error' in auth) return auth
  const { supabase, profile } = auth

  const todayKey = formatJstDateKey()

  const { data: existingRows, error: selectError } = await supabase
    .from('trainer_availability')
    .select('slot_date, day_of_week, start_time, end_time')
    .eq('trainer_id', profile.id)

  if (selectError) {
    if (!isMissingSlotDateColumnError(selectError)) {
      return toActionError('保存に失敗しました（取得）', selectError.message)
    }

    const { data: legacyRows, error: legacySelectError } = await supabase
      .from('trainer_availability')
      .select('day_of_week, start_time, end_time')
      .eq('trainer_id', profile.id)

    if (legacySelectError) {
      return toActionError('保存に失敗しました（取得）', legacySelectError.message)
    }

    const legacyMap = new Map<number, { start_time: string; end_time: string }>()
    for (const row of legacyRows ?? []) {
      legacyMap.set(row.day_of_week as number, {
        start_time: (row.start_time as string).slice(0, 8),
        end_time: (row.end_time as string).slice(0, 8),
      })
    }

    if (mode === 'open') {
      legacyMap.set(dayOfWeek, { start_time: startTime, end_time: endTime })
    } else {
      legacyMap.delete(dayOfWeek)
    }

    const { error: deleteError } = await supabase
      .from('trainer_availability')
      .delete()
      .eq('trainer_id', profile.id)

    if (deleteError) {
      return toActionError('保存に失敗しました（削除）', deleteError.message)
    }

    if (legacyMap.size > 0) {
      const rows = Array.from(legacyMap.entries()).map(([dow, v]) => ({
        trainer_id: profile.id,
        day_of_week: dow,
        start_time: v.start_time,
        end_time: v.end_time,
      }))
      const { error: insertError } = await supabase.from('trainer_availability').insert(rows)
      if (insertError) {
        return toActionError('保存に失敗しました（登録）', insertError.message)
      }
    }

    revalidatePath('/trainer/availability')
    return {}
  }

  const byDate = new Map<string, AvailabilitySlot>()
  for (const row of existingRows ?? []) {
    const dateKey = row.slot_date as string | null
    if (!dateKey) continue
    byDate.set(dateKey, {
      slot_date: dateKey,
      start_time: (row.start_time as string).slice(0, 8),
      end_time: (row.end_time as string).slice(0, 8),
    })
  }

  for (let offset = 0; offset <= RECURRING_PRESET_WINDOW_DAYS; offset += 1) {
    const key = addDaysToDateKey(todayKey, offset)
    if (dayOfWeekForDateKey(key) !== dayOfWeek) continue
    if (mode === 'open') {
      byDate.set(key, {
        slot_date: key,
        start_time: startTime,
        end_time: endTime,
      })
    } else {
      byDate.delete(key)
    }
  }

  const slots = Array.from(byDate.values())
  if (slots.length === 0 && mode === 'open') {
    slots.push({
      slot_date: nextDateKeyForDayOfWeek(dayOfWeek),
      start_time: startTime,
      end_time: endTime,
    })
  }

  return saveAvailabilityAction(slots)
}

export async function createTrainerReservationAction(
  input: CreateTrainerReservationInput
): Promise<ActionResult> {
  const auth = await getAuthedTrainerProfile(true)
  if ('error' in auth) return auth
  const { supabase, profile } = auth

  const { data: relation } = await supabase
    .from('trainer_trainee')
    .select('id')
    .eq('trainer_id', profile.id)
    .eq('trainee_id', input.trainee_id)
    .eq('status', 'active')
    .maybeSingle()
  if (!relation) return { error: 'このお客さんには予約を作成できません' }

  let menuPrice = profile.price_per_session ?? 0
  if (input.plan_id) {
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id, price')
      .eq('id', input.plan_id)
      .eq('trainer_id', profile.id)
      .maybeSingle()
    if (planError || !plan) return { error: 'セッションメニューが見つかりません' }
    menuPrice = plan.price
  }

  const scheduledDateMap = new Map<number, Date>()
  const firstDate = parseJstDateTime(input.date, input.start_time)
  if (Number.isNaN(firstDate.getTime())) return { error: '日時が不正です' }
  scheduledDateMap.set(firstDate.getTime(), firstDate)

  if (input.repeat_enabled) {
    const repeatStart = parseJstDateTime(input.repeat_start_date ?? input.date, input.start_time)
    const repeatUntil = parseJstDateTime(input.repeat_until_date ?? input.date, '23:59:59')
    if (Number.isNaN(repeatStart.getTime()) || Number.isNaN(repeatUntil.getTime())) {
      return { error: '繰り返し日付が不正です' }
    }
    if (repeatStart > repeatUntil) {
      return { error: '繰り返し終了日は開始日以降にしてください' }
    }

    for (let cursor = new Date(repeatStart); cursor <= repeatUntil; ) {
      const next = new Date(cursor)
      scheduledDateMap.set(next.getTime(), next)
      cursor = new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000)
    }
  }

  const scheduledDates = Array.from(scheduledDateMap.values())
  scheduledDates.sort((a, b) => a.getTime() - b.getTime())
  const settings = readTrainerSettingsFromBio(profile.bio)
  const sessionMs = settings.session_duration_minutes * 60 * 1000
  const rangeStart = new Date(Math.min(...scheduledDates.map((d) => d.getTime())) - sessionMs)
  const rangeEnd = new Date(Math.max(...scheduledDates.map((d) => d.getTime())) + sessionMs)

  const { data: duplicates } = await supabase
    .from('bookings')
    .select('id, scheduled_at')
    .eq('trainer_id', profile.id)
    .in('status', ['pending', 'confirmed', 'completed'])
    .gte('scheduled_at', rangeStart.toISOString())
    .lte('scheduled_at', rangeEnd.toISOString())

  const hasOverlap = scheduledDates.some((scheduledDate) => {
    const start = scheduledDate.getTime()
    const end = start + sessionMs
    return (duplicates ?? []).some((booking) => {
      const bookingStart = new Date(booking.scheduled_at).getTime()
      const bookingEnd = bookingStart + sessionMs
      return start < bookingEnd && end > bookingStart
    })
  })

  if (hasOverlap) {
    return { error: '既存予約と時間が重なっています。開始時刻を調整してください。' }
  }

  const rows = scheduledDates.map((d) => ({
    trainer_id: profile.id,
    trainee_id: input.trainee_id,
    scheduled_at: d.toISOString(),
    status: 'confirmed',
    price: menuPrice,
  }))
  const { data: insertedBookings, error: insertError } = await supabase
    .from('bookings')
    .insert(rows)
    .select('id, trainee_id')
  if (insertError) {
    return { error: `予約作成に失敗しました: ${insertError.message}` }
  }

  for (const booking of insertedBookings ?? []) {
    try {
      await attachFirstAvailableCreditForCustomerToBooking({
        supabase,
        trainerId: profile.id,
        traineeId: booking.trainee_id,
        bookingId: booking.id,
      })
    } catch (error) {
      console.error('[createTrainerReservationAction] session_credits attach error:', error)
    }
  }

  revalidatePath('/trainer/availability')
  revalidatePath('/trainer/bookings')
  revalidatePath('/trainer/clients')
  revalidatePath('/book')
  return {}
}
