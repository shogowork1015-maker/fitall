'use server'

import { revalidatePath } from 'next/cache'
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

  // Context supplies trusted identities; never take trainer/customer IDs from the form.
  // One DB transaction creates the booking and reserves its ticket. No unsafe fallback
  // is allowed when the migration/RPC is missing.
  const { data: bookingId, error: bookingError } = await supabase.rpc('fitall_book_customer_ticket', {
      p_trainer_id: trainerProfile.id,
      p_trainee_id: traineeProfile.id,
      p_scheduled_at: scheduledAt,
    })

  if (bookingError || !bookingId) {
    if (bookingError?.code === 'P0002') {
      return { status: 'error', needsPurchase: true, message: '使えるチケットがありません。残数を確認して再度お試しください。' }
    }
    return { status: 'error', message: ['23505', '23P01'].includes(bookingError?.code ?? '')
      ? 'この日時は直前に埋まりました。別の日時を選んでください。'
      : '予約の作成に失敗しました。少し時間をおいて再度お試しください。' }
  }

  let notificationFailed = false
  try {
    await sendTicketBookingConfirmationNotifications({ scheduledAt, customer: customerUser, trainer: trainerUser })
  } catch {
    notificationFailed = true
  }

  revalidatePath('/customer/app')
  revalidatePath('/customer/app/bookings')
  revalidatePath('/customer/app/bookings/list')
  revalidatePath('/customer/app/tickets')
  revalidatePath('/trainer/bookings')
  revalidatePath('/trainer/dashboard')

  return { status: 'success', message: notificationFailed
    ? '予約は確定しました。通知を送信できなかったため、予約一覧で内容をご確認ください。'
    : '予約が確定しました。' }
}
