'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { RECURRING_PRESET_WINDOW_DAYS } from '@/lib/booking-policy'

export interface AvailabilitySlot {
  slot_date: string
  start_time: string
  end_time: string
}

export interface WeeklyRecurringRule {
  day_of_week: number
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

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function nextDateKeyForDayOfWeek(dayOfWeek: number): string {
  const base = new Date()
  for (let i = 0; i < 7; i += 1) {
    const d = addDays(base, i)
    if (d.getDay() === dayOfWeek) return toDateKey(d)
  }
  return toDateKey(base)
}

function isMissingSlotDateColumnError(error: { message?: string; code?: string } | null): boolean {
  const message = error?.message ?? ''
  return error?.code === 'PGRST204' || message.includes("'slot_date' column")
}

// 空き時間を全て上書き保存する
export async function saveAvailabilityAction(
  slots: AvailabilitySlot[]
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: '認証が必要です' }

  const { data: profile } = await supabase
    .from('trainer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) return { error: 'トレーナープロフィールが見つかりません' }

  // 既存レコードをすべて削除してから新規挿入
  const { error: deleteError } = await supabase
    .from('trainer_availability')
    .delete()
    .eq('trainer_id', profile.id)

  if (deleteError) {
    console.error('[saveAvailabilityAction] delete error:', deleteError)
    return { error: `保存に失敗しました（削除）: ${deleteError.message}` }
  }

  if (slots.length > 0) {
    const rows = slots.map((s) => ({
      trainer_id: profile.id,
      slot_date: s.slot_date,
      day_of_week: new Date(`${s.slot_date}T00:00:00`).getDay(),
      start_time: s.start_time,
      end_time: s.end_time,
    }))
    const { error: insertError } = await supabase
      .from('trainer_availability')
      .insert(rows)

    if (insertError) {
      // 旧スキーマ（slot_date なし）向けフォールバック
      if (isMissingSlotDateColumnError(insertError)) {
        const weeklyMap = new Map<number, { start_time: string; end_time: string }>()
        for (const s of slots) {
          const dow = new Date(`${s.slot_date}T00:00:00`).getDay()
          weeklyMap.set(dow, {
            start_time: s.start_time,
            end_time: s.end_time,
          })
        }

        const legacyRows = Array.from(weeklyMap.entries()).map(([day_of_week, v]) => ({
          trainer_id: profile.id,
          day_of_week,
          start_time: v.start_time,
          end_time: v.end_time,
        }))

        const { error: legacyInsertError } = await supabase
          .from('trainer_availability')
          .insert(legacyRows)

        if (legacyInsertError) {
          console.error('[saveAvailabilityAction] legacy insert error:', legacyInsertError)
          return { error: `保存に失敗しました（登録）: ${legacyInsertError.message}` }
        }
      } else {
        console.error('[saveAvailabilityAction] insert error:', insertError)
        return { error: `保存に失敗しました（登録）: ${insertError.message}` }
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
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: '認証が必要です' }

  const { data: profile } = await supabase
    .from('trainer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) return { error: 'トレーナープロフィールが見つかりません' }

  const today = new Date()
  const end = addDays(today, RECURRING_PRESET_WINDOW_DAYS)

  const { data: existingRows, error: selectError } = await supabase
    .from('trainer_availability')
    .select('slot_date, day_of_week, start_time, end_time')
    .eq('trainer_id', profile.id)

  if (selectError) {
    if (!isMissingSlotDateColumnError(selectError)) {
      return { error: `保存に失敗しました（取得）: ${selectError.message}` }
    }

    const { data: legacyRows, error: legacySelectError } = await supabase
      .from('trainer_availability')
      .select('day_of_week, start_time, end_time')
      .eq('trainer_id', profile.id)

    if (legacySelectError) {
      return { error: `保存に失敗しました（取得）: ${legacySelectError.message}` }
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
      return { error: `保存に失敗しました（削除）: ${deleteError.message}` }
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
        return { error: `保存に失敗しました（登録）: ${insertError.message}` }
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

  for (let cursor = new Date(today); cursor <= end; cursor = addDays(cursor, 1)) {
    if (cursor.getDay() !== dayOfWeek) continue
    const key = toDateKey(cursor)
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
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: '認証が必要です' }

  const { data: profile } = await supabase
    .from('trainer_profiles')
    .select('id, price_per_session')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile) return { error: 'トレーナープロフィールが見つかりません' }

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

  const scheduledDates: Date[] = []
  const firstDate = new Date(`${input.date}T${input.start_time}:00`)
  if (Number.isNaN(firstDate.getTime())) return { error: '日時が不正です' }
  scheduledDates.push(firstDate)

  if (input.repeat_enabled) {
    const repeatStart = new Date(`${input.repeat_start_date ?? input.date}T${input.start_time}:00`)
    const repeatUntil = new Date(`${input.repeat_until_date ?? input.date}T23:59:59`)
    if (Number.isNaN(repeatStart.getTime()) || Number.isNaN(repeatUntil.getTime())) {
      return { error: '繰り返し日付が不正です' }
    }
    if (repeatStart > repeatUntil) {
      return { error: '繰り返し終了日は開始日以降にしてください' }
    }

    for (let cursor = new Date(repeatStart); cursor <= repeatUntil; ) {
      if (!scheduledDates.some((d) => d.getTime() === cursor.getTime())) {
        scheduledDates.push(new Date(cursor))
      }
      cursor = addDays(cursor, 7)
    }
  }

  scheduledDates.sort((a, b) => a.getTime() - b.getTime())
  const isoList = scheduledDates.map((d) => d.toISOString())

  const { data: duplicates } = await supabase
    .from('bookings')
    .select('id, scheduled_at')
    .eq('trainer_id', profile.id)
    .in('status', ['pending', 'confirmed', 'completed'])
    .in('scheduled_at', isoList)

  if ((duplicates ?? []).length > 0) {
    return { error: '同じ日時に既存予約があります。時間を調整してください。' }
  }

  const rows = scheduledDates.map((d) => ({
    trainer_id: profile.id,
    trainee_id: input.trainee_id,
    scheduled_at: d.toISOString(),
    status: 'confirmed',
    price: menuPrice,
  }))
  const { error: insertError } = await supabase.from('bookings').insert(rows)
  if (insertError) {
    return { error: `予約作成に失敗しました: ${insertError.message}` }
  }

  revalidatePath('/trainer/availability')
  revalidatePath('/trainer/bookings')
  revalidatePath('/trainee/booking')
  return {}
}
