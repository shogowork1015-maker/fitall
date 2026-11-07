import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseAdminLike = {
  from: SupabaseClient['from']
  rpc: SupabaseClient['rpc']
}

export interface EnsureCreditPurchaseInput {
  supabase: SupabaseAdminLike
  trainerId: string
  traineeId: string
  planId: string | null
  stripeCheckoutSessionId: string
  stripePaymentIntentId?: string | null
  amount: number
  quantity: number
}

export async function ensureCreditPurchase(input: EnsureCreditPurchaseInput) {
  const { supabase } = input

  const { data: existingPurchaseRaw, error: lookupError } = await supabase
    .from('session_credit_purchases')
    .select('id')
    .eq('stripe_checkout_session_id', input.stripeCheckoutSessionId)
    .maybeSingle()
  if (lookupError) throw new Error(`purchase lookup failed: ${lookupError.message}`)
  const existingPurchase = existingPurchaseRaw as { id?: string } | null

  if (existingPurchase?.id) {
    return existingPurchase.id
  }

  const { data: purchaseRaw, error: purchaseError } = await supabase
    .from('session_credit_purchases')
    .insert({
      trainer_id: input.trainerId,
      trainee_id: input.traineeId,
      plan_id: input.planId,
      stripe_checkout_session_id: input.stripeCheckoutSessionId,
      stripe_payment_intent_id: input.stripePaymentIntentId,
      amount: input.amount,
      quantity: input.quantity,
      status: 'paid',
      purchased_at: new Date().toISOString(),
    })
    .select('id')
    .maybeSingle()
  const purchase = purchaseRaw as { id?: string } | null

  // Another delivery may have inserted the same checkout session concurrently.
  if (purchaseError?.code === '23505') {
    const { data, error } = await supabase.from('session_credit_purchases')
      .select('id').eq('stripe_checkout_session_id', input.stripeCheckoutSessionId).maybeSingle()
    if (!error && data?.id) return data.id as string
  }
  if (purchaseError || !purchase) {
    throw new Error(`session_credit_purchases insert failed: ${purchaseError?.message ?? 'unknown'}`)
  }

  return purchase.id as string
}

export async function ensureCreditsForPurchase(input: {
  supabase: SupabaseAdminLike
  purchaseId: string
  trainerId: string
  traineeId: string
  quantity: number
}) {
  const { data, error } = await input.supabase.rpc('fitall_ensure_purchase_credits', {
    p_purchase_id: input.purchaseId,
    p_trainer_id: input.trainerId,
    p_trainee_id: input.traineeId,
    p_quantity: input.quantity,
  })
  if (error || !Array.isArray(data) || data.length !== input.quantity) {
    throw new Error(`session_credits issuance failed: ${error?.message ?? 'invalid result'}`)
  }
  return data
}

export async function attachFirstAvailableCreditToBooking(input: {
  supabase: SupabaseAdminLike
  purchaseId: string
  bookingId: string
}) {
  const { supabase } = input
  const { data: existingForBookingRaw } = await supabase
    .from('session_credits')
    .select('id')
    .eq('booking_id', input.bookingId)
    .maybeSingle()
  const existingForBooking = existingForBookingRaw as { id?: string } | null

  if (existingForBooking?.id) {
    return existingForBooking.id
  }

  const { data: creditRaw } = await supabase
    .from('session_credits')
    .select('id')
    .eq('purchase_id', input.purchaseId)
    .is('booking_id', null)
    .eq('status', 'available')
    .order('created_at')
    .limit(1)
    .maybeSingle()
  const credit = creditRaw as { id?: string } | null

  if (!credit?.id) {
    throw new Error('予約に紐づけられるチケットがありません')
  }

  const { data: attached, error } = await supabase
    .from('session_credits')
    .update({
      booking_id: input.bookingId,
      status: 'scheduled',
    })
    .eq('id', credit.id)
    .eq('status', 'available')
    .is('booking_id', null)
    .select('id')
    .maybeSingle()

  if (error || !attached?.id) {
    throw new Error(`session_credits update failed: ${error?.message ?? 'ticket already reserved'}`)
  }

  return credit.id as string
}

export async function attachFirstAvailableCreditForCustomerToBooking(input: {
  supabase: SupabaseAdminLike
  trainerId: string
  traineeId: string
  bookingId: string
}) {
  const { supabase } = input
  const { data: existingForBookingRaw } = await supabase
    .from('session_credits')
    .select('id')
    .eq('booking_id', input.bookingId)
    .maybeSingle()
  const existingForBooking = existingForBookingRaw as { id?: string } | null

  if (existingForBooking?.id) {
    return existingForBooking.id
  }

  const { data: creditRaw } = await supabase
    .from('session_credits')
    .select('id')
    .eq('trainer_id', input.trainerId)
    .eq('trainee_id', input.traineeId)
    .is('booking_id', null)
    .eq('status', 'available')
    .order('created_at')
    .limit(1)
    .maybeSingle()
  const credit = creditRaw as { id?: string } | null

  if (!credit?.id) {
    return null
  }

  const { data: attached, error } = await supabase
    .from('session_credits')
    .update({
      booking_id: input.bookingId,
      status: 'scheduled',
    })
    .eq('id', credit.id)
    .eq('status', 'available')
    .is('booking_id', null)
    .select('id')
    .maybeSingle()

  if (error || !attached?.id) {
    throw new Error(`session_credits update failed: ${error?.message ?? 'ticket already reserved'}`)
  }

  return credit.id
}

export function planSessionQuantity(planSessions: unknown) {
  const n = Number(planSessions)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
}
