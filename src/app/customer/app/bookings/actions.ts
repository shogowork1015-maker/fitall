'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sendTicketBookingConfirmationNotifications } from '@/lib/booking-notifications'
import { findTrainerBookingOverlap } from '@/lib/booking-overlap'
import { loadCustomerAppMutationContext } from '@/lib/customer-app'
import { isPublicSlotAvailable } from '@/lib/public-booking'

export type CustomerBookingActionState =
  | { status: 'error'; message: string; needsPurchase?: boolean }
  | { status: 'success'; message: string }
  | null

function requiredString(formData: FormData, key: string, maxLength = 200) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function normalizeIsoDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

export async function createCustomerBookingAction(
  _prevState: CustomerBookingActionState,
  formData: FormData
): Promise<CustomerBookingActionState> {
  const scheduledAt = normalizeIsoDate(requiredString(formData, 'scheduled_at', 64))
  if (!scheduledAt) {
    return { status: 'error', message: '予約日時を選択してください' }
  }
  if (new Date(scheduledAt) <= new Date()) {
    return { status: 'error', message: '過去の日時は予約できません' }
  }

  const context = await loadCustomerAppMutationContext()
  if (!context) {
    return { status: 'error', message: 'LINEの登録リンクからマイページを開いて予約してください' }
  }

  const { supabase, customerUser, traineeProfile, trainerProfile, trainerUser } = context
  const { data: credit } = await supabase
    .from('session_credits')
    .select('id')
    .eq('trainer_id', trainerProfile.id)
    .eq('trainee_id', traineeProfile.id)
    .eq('status', 'available')
    .is('booking_id', null)
    .order('created_at')
    .limit(1)
    .maybeSingle()

  if (!credit?.id) {
    return {
      status: 'error',
      needsPurchase: true,
      message: '使えるチケットがありません。先にチケットを購入してください。',
    }
  }

  const available = await isPublicSlotAvailable(trainerProfile.id, scheduledAt)
  if (!available) {
    return { status: 'error', message: 'この日時はすでに埋まっているか、受付時間外です' }
  }

  const overlap = await findTrainerBookingOverlap({
    supabase,
    trainerId: trainerProfile.id,
    trainerBio: trainerProfile.bio,
    scheduledAt,
  })
  if (overlap.overlaps) {
    return { status: 'error', message: 'この日時はすでに予約が入っています。別の日時を選んでください。' }
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      trainer_id: trainerProfile.id,
      trainee_id: traineeProfile.id,
      scheduled_at: scheduledAt,
      status: 'confirmed',
      price: 0,
    })
    .select('id')
    .maybeSingle()

  if (bookingError || !booking?.id) {
    return {
      status: 'error',
      message:
        bookingError?.code === '23505'
          ? 'この日時は直前に埋まりました。別の日時を選んでください。'
          : '予約の作成に失敗しました。少し時間をおいて再度お試しください。',
    }
  }

  const { data: attachedCredit, error: creditError } = await supabase
    .from('session_credits')
    .update({
      booking_id: booking.id,
      status: 'scheduled',
    })
    .eq('id', credit.id)
    .eq('status', 'available')
    .is('booking_id', null)
    .select('id')
    .maybeSingle()

  if (creditError || !attachedCredit?.id) {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id)
    return {
      status: 'error',
      message: 'チケットの紐づけに失敗しました。もう一度お試しください。',
    }
  }

  await sendTicketBookingConfirmationNotifications({
    scheduledAt,
    customer: customerUser,
    trainer: trainerUser,
  })

  revalidatePath('/customer/app')
  revalidatePath('/customer/app/bookings')
  revalidatePath('/customer/app/tickets')
  revalidatePath('/trainer/bookings')
  revalidatePath('/trainer/dashboard')

  redirect('/customer/app/bookings?booked=1')
}
