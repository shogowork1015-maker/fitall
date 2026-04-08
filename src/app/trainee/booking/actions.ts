'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { BOOKING_CANCEL_DEADLINE_HOURS, getBookingOpenUntil } from '@/lib/booking-policy'
import { readTrainerSettingsFromBio } from '@/lib/trainer-settings'

export type BookingRequestState = { error: string } | { success: true } | null

function normalizeTime(value: string): string {
  return value.slice(0, 5)
}

export async function requestBookingAction(
  _prevState: BookingRequestState,
  formData: FormData
): Promise<BookingRequestState> {
  const dateStr = formData.get('date') as string
  const timeStr = formData.get('time') as string

  if (!dateStr || !timeStr) {
    return { error: '日時を選択してください' }
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: '認証が必要です' }

  // trainer_trainee.trainee_id は trainee_profiles.id を参照するため先に取得
  const { data: myTraineeProfile } = await supabase
    .from('trainee_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!myTraineeProfile) return { error: 'トレーニープロフィールが見つかりません' }

  // トレーナーとの関係を取得（trainer_id は trainer_profiles.id）
  const { data: relation } = await supabase
    .from('trainer_trainee')
    .select('trainer_id')
    .eq('trainee_id', myTraineeProfile.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!relation) return { error: 'トレーナーとの紐付けがありません' }

  // trainer_profiles.id から料金を取得
  const { data: trainerProfile } = await supabase
    .from('trainer_profiles')
    .select('price_per_session, bio')
    .eq('id', relation.trainer_id)
    .maybeSingle()

  if (!trainerProfile) return { error: 'トレーナー情報の取得に失敗しました' }

  const scheduledAt = new Date(`${dateStr}T${timeStr}:00`)

  if (scheduledAt < new Date()) {
    return { error: '過去の日時は指定できません' }
  }

  const bookingOpenUntil = getBookingOpenUntil()
  if (scheduledAt > bookingOpenUntil) {
    return {
      error: `予約できるのは${bookingOpenUntil.toLocaleDateString('ja-JP')}までです`,
    }
  }

  const timeOnly = `${String(scheduledAt.getHours()).padStart(2, '0')}:${String(scheduledAt.getMinutes()).padStart(2, '0')}`
  const trainerSettings = readTrainerSettingsFromBio(trainerProfile.bio)
  const sessionMinute = scheduledAt.getMinutes()
  const minuteStep = trainerSettings.session_duration_minutes
  if (sessionMinute % minuteStep !== 0) {
    return {
      error: `予約時間は${minuteStep}分単位で選択してください`,
    }
  }
  if (timeOnly < trainerSettings.business_open || timeOnly >= trainerSettings.business_close) {
    return {
      error: `営業時間は ${trainerSettings.business_open}〜${trainerSettings.business_close} です`,
    }
  }

  // 空き時間チェック（設定がある場合のみ）
  const slotDate = `${dateStr}`

  let avail: { start_time: string; end_time: string } | null = null
  let availCount = 0

  const { data: availByDate, error: availByDateError } = await supabase
    .from('trainer_availability')
    .select('start_time, end_time')
    .eq('trainer_id', relation.trainer_id)
    .eq('slot_date', slotDate)
    .maybeSingle()

  if (availByDateError && (availByDateError.code === 'PGRST204' || availByDateError.message?.includes("'slot_date' column"))) {
    const dayOfWeek = scheduledAt.getDay()
    const { data: availLegacy } = await supabase
      .from('trainer_availability')
      .select('start_time, end_time')
      .eq('trainer_id', relation.trainer_id)
      .eq('day_of_week', dayOfWeek)
      .maybeSingle()
    const { count: availLegacyCount } = await supabase
      .from('trainer_availability')
      .select('*', { count: 'exact', head: true })
      .eq('trainer_id', relation.trainer_id)
    avail = availLegacy
    availCount = availLegacyCount ?? 0
  } else {
    const { count: countByDate } = await supabase
      .from('trainer_availability')
      .select('*', { count: 'exact', head: true })
      .eq('trainer_id', relation.trainer_id)
    avail = availByDate
    availCount = countByDate ?? 0
  }

  if ((availCount ?? 0) > 0) {
    if (!avail) {
      return { error: 'この日はトレーナーの受付時間外です' }
    }
    const startNorm = normalizeTime(avail.start_time)
    const endNorm = normalizeTime(avail.end_time)
    if (timeOnly < startNorm || timeOnly >= endNorm) {
      return { error: `受付時間は ${startNorm}〜${endNorm} です` }
    }
  }

  // book_session RPC でダブルブッキング防止（トランザクション保証）
  const { data: bookingId, error: rpcError } = await supabase.rpc('book_session', {
    p_trainer_id: relation.trainer_id,
    p_trainee_id: myTraineeProfile.id,
    p_scheduled_at: scheduledAt.toISOString(),
    p_price: trainerProfile.price_per_session ?? 0,
  })

  if (rpcError) {
    console.error('[requestBookingAction] book_session error:', rpcError)
    // DBの RAISE EXCEPTION メッセージをそのまま表示
    const msg = rpcError.message ?? ''
    if (msg.includes('すでに予約が入っています')) {
      return { error: 'この時間帯はすでに予約が入っています' }
    }
    if (rpcError.code === '23505') {
      return { error: '同じ日時の予約はすでに存在します' }
    }
    return { error: `予約リクエストの送信に失敗しました: ${msg}` }
  }

  if (!bookingId) {
    return { error: '予約の作成に失敗しました' }
  }

  revalidatePath('/trainee/booking')
  return { success: true }
}

// トレーニーが自分の予約をキャンセル（24時間前まで）
export async function cancelBookingAction(bookingId: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: '認証が必要です' }

  const { data: myProfiles } = await supabase
    .from('trainee_profiles')
    .select('id')
    .eq('user_id', user.id)

  const traineeIds = (myProfiles ?? []).map((p) => p.id)
  if (!traineeIds.length) return { error: 'トレーニープロフィールが見つかりません' }

  // 自分の予約か確認＋scheduled_at 取得
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, scheduled_at, status')
    .eq('id', bookingId)
    .in('trainee_id', traineeIds)
    .maybeSingle()

  if (!booking) return { error: '予約が見つかりません' }

  if (!['pending', 'confirmed'].includes(booking.status)) {
    return { error: 'キャンセルできない状態の予約です' }
  }

  // キャンセル締切チェック
  const hoursUntil = (new Date(booking.scheduled_at).getTime() - Date.now()) / 3600000
  if (hoursUntil < BOOKING_CANCEL_DEADLINE_HOURS) {
    return {
      error: `${BOOKING_CANCEL_DEADLINE_HOURS}時間以内の予約はトレーナーに連絡してキャンセルしてください`,
    }
  }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)

  if (error) {
    console.error('[cancelBookingAction] error:', error)
    return { error: 'キャンセルに失敗しました' }
  }

  revalidatePath('/trainee/booking')
  return {}
}

// トレーナーからの日時変更提案を承認
export async function acceptChangeAction(proposalId: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: '認証が必要です' }

  // 提案情報を取得
  const { data: proposal } = await supabase
    .from('booking_changes')
    .select('id, booking_id, proposed_at')
    .eq('id', proposalId)
    .eq('status', 'pending')
    .maybeSingle()

  if (!proposal) return { error: '提案が見つかりません' }

  const { data: myProfiles } = await supabase
    .from('trainee_profiles')
    .select('id')
    .eq('user_id', user.id)

  const traineeIds = (myProfiles ?? []).map((p) => p.id)
  if (!traineeIds.length) return { error: 'トレーニープロフィールが見つかりません' }

  // 予約の所有者確認
  const { data: booking } = await supabase
    .from('bookings')
    .select('id')
    .eq('id', proposal.booking_id)
    .in('trainee_id', traineeIds)
    .maybeSingle()

  if (!booking) return { error: '権限がありません' }

  // 提案を承認＋予約の日時を更新
  const { error: updateProposal } = await supabase
    .from('booking_changes')
    .update({ status: 'accepted' })
    .eq('id', proposalId)

  if (updateProposal) return { error: '承認に失敗しました' }

  const { error: updateBooking } = await supabase
    .from('bookings')
    .update({ scheduled_at: proposal.proposed_at })
    .eq('id', proposal.booking_id)

  if (updateBooking) return { error: '予約の更新に失敗しました' }

  revalidatePath('/trainee/booking')
  return {}
}

// トレーナーからの日時変更提案を拒否
export async function rejectChangeAction(proposalId: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: '認証が必要です' }

  const { data: myProfiles } = await supabase
    .from('trainee_profiles')
    .select('id')
    .eq('user_id', user.id)

  const traineeIds = (myProfiles ?? []).map((p) => p.id)
  if (!traineeIds.length) return { error: 'トレーニープロフィールが見つかりません' }

  // 提案情報を取得（自分の予約かチェック）
  const { data: proposal } = await supabase
    .from('booking_changes')
    .select('id, booking_id')
    .eq('id', proposalId)
    .eq('status', 'pending')
    .maybeSingle()

  if (!proposal) return { error: '提案が見つかりません' }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id')
    .eq('id', proposal.booking_id)
    .in('trainee_id', traineeIds)
    .maybeSingle()

  if (!booking) return { error: '権限がありません' }

  const { error } = await supabase
    .from('booking_changes')
    .update({ status: 'rejected' })
    .eq('id', proposalId)

  if (error) return { error: '拒否に失敗しました' }

  revalidatePath('/trainee/booking')
  return {}
}
