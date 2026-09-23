import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseAdminLike = {
  from: SupabaseClient['from']
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

  const { data: existingPurchaseRaw } = await supabase
    .from('session_credit_purchases')
    .select('id')
    .eq('stripe_checkout_session_id', input.stripeCheckoutSessionId)
    .maybeSingle()
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
  const { supabase } = input
  const { data: existingCreditsRaw } = await supabase
    .from('session_credits')
    .select('id, booking_id, status')
    .eq('purchase_id', input.purchaseId)
    .order('created_at')

  const existing = Array.isArray(existingCreditsRaw) ? existingCreditsRaw : []
  if (existing.length >= input.quantity) {
    return existing
  }

  const rows = Array.from({ length: input.quantity - existing.length }, () => ({
    id: randomUUID(),
    purchase_id: input.purchaseId,
    trainer_id: input.trainerId,
    trainee_id: input.traineeId,
    status: 'available',
  }))

  const { error } = await supabase.from('session_credits').insert(rows)
  if (error) {
    throw new Error(`session_credits insert failed: ${error.message}`)
  }

  const { data: creditsRaw } = await supabase
    .from('session_credits')
    .select('id, booking_id, status')
    .eq('purchase_id', input.purchaseId)
    .order('created_at')

  return Array.isArray(creditsRaw) ? creditsRaw : []
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
    .in('status', ['available', 'scheduled'])
    .order('created_at')
    .limit(1)
    .maybeSingle()
  const credit = creditRaw as { id?: string } | null

  if (!credit?.id) {
    throw new Error('予約に紐づけられるチケットがありません')
  }

  const { error } = await supabase
    .from('session_credits')
    .update({
      booking_id: input.bookingId,
      status: 'scheduled',
    })
    .eq('id', credit.id)

  if (error) {
    throw new Error(`session_credits update failed: ${error.message}`)
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

  const { error } = await supabase
    .from('session_credits')
    .update({
      booking_id: input.bookingId,
      status: 'scheduled',
    })
    .eq('id', credit.id)

  if (error) {
    throw new Error(`session_credits update failed: ${error.message}`)
  }

  return credit.id
}

export function planSessionQuantity(planSessions: unknown) {
  const n = Number(planSessions)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
}
