'use server'

import { revalidatePath } from 'next/cache'
import { loadCustomerAppMutationContext } from '@/lib/customer-app'
import { getPublicBookingData } from '@/lib/public-booking'
import type { PublicBookingSlot } from '@/lib/public-booking'

export type BookingChangeResult = { status: 'success' | 'error'; message: string }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function loadBookingChangeSlots(bookingId: string): Promise<{ slots: PublicBookingSlot[]; error?: string }> {
  try {
    if (!uuid.test(bookingId)) return { slots: [], error: '予約を確認できませんでした。' }
    const context = await loadCustomerAppMutationContext()
    if (!context) return { slots: [], error: 'ログインし直してください。' }
    const { supabase, trainerProfile, traineeProfile } = context
    const { data, error } = await supabase.from('bookings').select('id, scheduled_at, status')
      .eq('id', bookingId).eq('trainer_id', trainerProfile.id).eq('trainee_id', traineeProfile.id).maybeSingle()
    if (error || !data || !['pending', 'confirmed'].includes(data.status)) return { slots: [], error: '予約一覧を更新してください。' }
    if (Date.parse(data.scheduled_at) < Date.now() + 86400000) return { slots: [], error: '変更期限を過ぎています。トレーナーへご連絡ください。' }
    const available = await getPublicBookingData(trainerProfile.id, bookingId)
    return { slots: (available?.slots ?? []).filter(slot => Date.parse(slot.value) >= Date.now() + 86400000 && Date.parse(slot.value) !== Date.parse(data.scheduled_at)) }
  } catch { return { slots: [], error: '空き時間を取得できませんでした。再度お試しください。' } }
}

export async function changeCustomerBooking(input: { bookingId: string; expectedAt: string; newAt?: string }): Promise<BookingChangeResult> {
  try {
    if (!input || !uuid.test(input.bookingId) || !Number.isFinite(Date.parse(input.expectedAt)) ||
      (input.newAt !== undefined && !Number.isFinite(Date.parse(input.newAt)))) {
      return { status: 'error', message: '予約日時を確認してください。' }
    }
    const context = await loadCustomerAppMutationContext()
    if (!context) return { status: 'error', message: 'ログインし直してください。' }
    const { supabase, trainerProfile, traineeProfile } = context
    if (input.newAt !== undefined) {
      const result = await loadBookingChangeSlots(input.bookingId)
      if (result.error) return { status: 'error', message: result.error }
      if (!result.slots.some(slot => Date.parse(slot.value) === Date.parse(input.newAt!))) {
        return { status: 'error', message: 'この日時は受付できません。別の空き時間を選んでください。' }
      }
    }
    const { data, error } = await supabase.rpc('fitall_change_customer_booking', {
      p_trainer_id: trainerProfile.id, p_trainee_id: traineeProfile.id, p_booking_id: input.bookingId,
      p_expected_at: new Date(input.expectedAt).toISOString(), p_new_at: input.newAt ? new Date(input.newAt).toISOString() : null,
    })
    if (error || !data) {
      const messages: Record<string, string> = {
        P0005: '変更・キャンセルは開始24時間前までです。トレーナーへご連絡ください。',
        P0003: '予約が更新されています。予約一覧を読み直してください。',
        P0004: 'チケットの確認が必要です。トレーナーへご連絡ください。',
        '23P01': 'この日時は直前に埋まりました。元の予約はそのままです。別の日時を選んでください。',
      }
      return { status: 'error', message: messages[error?.code ?? ''] ?? '更新できませんでした。予約一覧を確認して再度お試しください。' }
    }
    for (const path of ['/customer/app', '/customer/app/bookings', '/customer/app/bookings/list', '/customer/app/tickets', '/trainer/bookings', '/trainer/dashboard', '/trainer/sales']) revalidatePath(path)
    const messages: Record<string, string> = {
      rescheduled: '予約日時を変更しました。チケットの追加消費はありません。',
      returned: 'キャンセルしました。チケット1枚を返却しました。',
      returned_expired: 'キャンセルしました。チケットは有効期限が過ぎているため再利用できません。',
      already_cancelled: 'この予約はすでにキャンセルされています。',
    }
    return { status: 'success', message: messages[data] ?? '予約を更新しました。' }
  } catch { return { status: 'error', message: '通信を確認して予約一覧を読み直してください。' } }
}
