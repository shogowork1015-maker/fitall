'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

// 予約を承認し、売上レコードを作成する
export async function approveBooking(bookingId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: booking, error: updateError } = await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId)
    .select('trainer_id, price')
    .maybeSingle()

  if (updateError) {
    console.error('[approveBooking] update error:', updateError)
    return
  }

  if (booking) {
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

  revalidatePath('/trainer/bookings')
  revalidatePath('/trainer/dashboard')
}

// 予約を拒否する
export async function rejectBooking(bookingId: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)

  if (error) {
    console.error('[rejectBooking] update error:', error)
  }

  revalidatePath('/trainer/bookings')
  revalidatePath('/trainer/dashboard')
}

// 予約を完了にする
export async function completeBooking(bookingId: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .eq('id', bookingId)

  if (error) {
    console.error('[completeBooking] update error:', error)
  }

  revalidatePath('/trainer/bookings')
  revalidatePath('/trainer/sales')
}

// トレーナーが日時変更を提案する
export async function proposeRescheduleAction(
  bookingId: string,
  newDateTime: string
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: '認証が必要です' }

  // 自分が担当する予約か確認（bookings.trainer_id は trainer_profiles.id）
  const { data: trainerProfile } = await supabase
    .from('trainer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!trainerProfile) return { error: 'トレーナープロフィールが見つかりません' }

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

  const proposedAt = new Date(newDateTime)
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
