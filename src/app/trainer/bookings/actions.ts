'use server'

import { sendTicketDepletedNotification } from '@/lib/booking-notifications'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { findTrainerBookingOverlap } from '@/lib/booking-overlap'
import { parseJstDateTimeInput } from '@/lib/datetime'
import { revalidatePath } from 'next/cache'

async function getAuthedTrainerProfile() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' as const }

  const { data: trainerProfile } = await supabase
    .from('trainer_profiles')
    .select('id, bio')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!trainerProfile) return { error: 'トレーナープロフィールが見つかりません' as const }
  return { supabase, user, trainerProfile }
}

async function notifyTicketDepletedIfNeeded(input: {
  trainerId: string
  traineeId: string
}) {
  const supabase = createAdminSupabaseClient()
  const { count, error: remainingError } = await supabase
    .from('session_credits')
    .select('id', { count: 'exact', head: true })
    .eq('trainer_id', input.trainerId)
    .eq('trainee_id', input.traineeId)
    .in('status', ['available', 'scheduled'])

  if (remainingError) throw new Error(remainingError.message)
  if ((count ?? 0) > 0) return

  const { data: traineeProfile } = await supabase
    .from('trainee_profiles')
    .select('user_id')
    .eq('id', input.traineeId)
    .maybeSingle()

  const customerUserId = traineeProfile?.user_id ?? input.traineeId
  const { data: customerUser } = await supabase
    .from('users')
    .select('name, email, line_user_id')
    .eq('id', customerUserId)
    .maybeSingle()

  const { data: trainerProfile } = await supabase
    .from('trainer_profiles')
    .select('user_id')
    .eq('id', input.trainerId)
    .maybeSingle()

  const { data: trainerUser } = trainerProfile?.user_id
    ? await supabase
        .from('users')
        .select('name, email, line_user_id')
        .eq('id', trainerProfile.user_id)
        .maybeSingle()
    : { data: null }

  await sendTicketDepletedNotification({
    customer: customerUser,
    trainer: trainerUser,
    trainerName: trainerUser?.name,
  })
}

// 予約を承認し、売上レコードを作成する
export async function approveBooking(bookingId: string) {
  const auth = await getAuthedTrainerProfile()
  if ('error' in auth) {
    console.error('[approveBooking]', auth.error)
    return
  }
  const { supabase, trainerProfile } = auth

  const { data: booking, error: updateError } = await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId)
    .eq('trainer_id', trainerProfile.id)
    .select('trainer_id, price')
    .maybeSingle()

  if (updateError) {
    console.error('[approveBooking] update error:', updateError)
    return
  }

  if (booking) {
    const { data: existingSale } = await supabase
      .from('sales_records')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle()

    if (!existingSale) {
      const { error: salesError } = await supabase.from('sales_records').insert({
        trainer_id: booking.trainer_id,
        booking_id: bookingId,
        amount: booking.price,
        paid_at: new Date().toISOString(),
      })
      if (salesError) {
        console.error('[approveBooking] sales_records insert error:', salesError)
      }
    }
  }

  revalidatePath('/trainer/bookings')
  revalidatePath('/trainer/dashboard')
}

// 予約を拒否する
export async function rejectBooking(bookingId: string) {
  const auth = await getAuthedTrainerProfile()
  if ('error' in auth) {
    console.error('[rejectBooking]', auth.error)
    return
  }
  const { supabase, trainerProfile } = auth

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .eq('trainer_id', trainerProfile.id)

  if (error) {
    console.error('[rejectBooking] update error:', error)
  } else {
    const { error: creditError } = await supabase
      .from('session_credits')
      .update({ status: 'available', booking_id: null })
      .eq('booking_id', bookingId)
      .eq('status', 'scheduled')

    if (creditError) {
      console.error('[rejectBooking] session_credits release error:', creditError)
    }
  }

  revalidatePath('/trainer/bookings')
  revalidatePath('/trainer/dashboard')
}

// 予約を完了にする
export async function completeBooking(bookingId: string) {
  const auth = await getAuthedTrainerProfile()
  if ('error' in auth) {
    console.error('[completeBooking]', auth.error)
    return
  }
  const { supabase, trainerProfile } = auth

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .eq('id', bookingId)
    .eq('trainer_id', trainerProfile.id)

  if (error) {
    console.error('[completeBooking] update error:', error)
  } else {
    const { data: usedCredit, error: creditError } = await supabase
      .from('session_credits')
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('booking_id', bookingId)
      .eq('status', 'scheduled')
      .select('trainer_id, trainee_id')
      .maybeSingle()

    if (creditError) {
      console.error('[completeBooking] session_credits update error:', creditError)
    } else if (usedCredit) {
      try {
        await notifyTicketDepletedIfNeeded({
          trainerId: usedCredit.trainer_id,
          traineeId: usedCredit.trainee_id,
        })
      } catch (notificationError) {
        console.error('[completeBooking] ticket depleted notification error:', notificationError)
      }
    }
  }

  revalidatePath('/trainer/bookings')
  revalidatePath('/trainer/clients')
  revalidatePath('/trainer/sales')
}

// トレーナーが日時変更を提案する
export async function proposeRescheduleAction(
  bookingId: string,
  newDateTime: string
): Promise<{ error?: string }> {
  const auth = await getAuthedTrainerProfile()
  if ('error' in auth) return auth
  const { supabase, user, trainerProfile } = auth

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('id', bookingId)
    .eq('trainer_id', trainerProfile.id)
    .maybeSingle()

  if (!booking) return { error: '予約が見つかりません' }
  if (!['confirmed', 'pending'].includes(booking.status)) {
    return { error: 'この予約は変更できません' }
  }

  // 既存の pending 提案があればキャンセル
  await supabase
    .from('booking_changes')
    .update({ status: 'rejected' })
    .eq('booking_id', bookingId)
    .eq('status', 'pending')

  const proposedAt = parseJstDateTimeInput(newDateTime)
  if (isNaN(proposedAt.getTime())) return { error: '無効な日時です' }

  const { error } = await supabase.from('booking_changes').insert({
    booking_id: bookingId,
    proposed_at: proposedAt.toISOString(),
    proposed_by: user.id,
    status: 'pending',
  })

  if (error) {
    console.error('[proposeRescheduleAction] error:', error)
    return { error: '提案の送信に失敗しました' }
  }

  revalidatePath('/trainer/bookings')
  return {}
}

// トレーナーが予約を別日時へ移動する（チケットは同じ予約に紐づいたまま）
export async function moveBookingAction(
  bookingId: string,
  newDateTime: string
): Promise<{ error?: string }> {
  const auth = await getAuthedTrainerProfile()
  if ('error' in auth) return auth
  const { supabase, trainerProfile } = auth

  const nextDate = parseJstDateTimeInput(newDateTime)
  if (Number.isNaN(nextDate.getTime())) return { error: '移動先の日時が不正です' }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('id', bookingId)
    .eq('trainer_id', trainerProfile.id)
    .maybeSingle()

  if (!booking) return { error: '予約が見つかりません' }
  if (!['pending', 'confirmed'].includes(booking.status)) {
    return { error: '完了済み・キャンセル済みの予約は移動できません' }
  }

  const overlap = await findTrainerBookingOverlap({
    supabase,
    trainerId: trainerProfile.id,
    trainerBio: trainerProfile.bio,
    scheduledAt: nextDate.toISOString(),
    excludeBookingId: bookingId,
  })

  if (overlap.overlaps) return { error: '移動先の時間は既存予約と重なっています' }

  const { error } = await supabase
    .from('bookings')
    .update({ scheduled_at: nextDate.toISOString(), status: 'confirmed' })
    .eq('id', bookingId)
    .eq('trainer_id', trainerProfile.id)

  if (error) {
    console.error('[moveBookingAction] update error:', error)
    return { error: `予約の移動に失敗しました: ${error.message}` }
  }

  revalidatePath('/trainer/bookings')
  revalidatePath('/trainer/dashboard')
  revalidatePath('/trainer/availability')
  revalidatePath('/book')
  return {}
}
