import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseLike = {
  from: SupabaseClient['from']
}

export const BOOKING_HOLD_MINUTES = 15

function isMissingBookingHoldsTable(error: { message?: string; code?: string } | null) {
  const message = error?.message ?? ''
  return error?.code === '42P01' || message.includes('booking_holds')
}

function isUniqueViolation(error: { message?: string; code?: string } | null) {
  return error?.code === '23505'
}

export async function expireStaleBookingHolds(input: {
  supabase: SupabaseLike
  trainerId?: string
  scheduledAt?: string
}) {
  let query = input.supabase
    .from('booking_holds')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lte('expires_at', new Date().toISOString())

  if (input.trainerId) query = query.eq('trainer_id', input.trainerId)
  if (input.scheduledAt) query = query.eq('scheduled_at', input.scheduledAt)

  const { error } = await query
  if (error && !isMissingBookingHoldsTable(error)) {
    console.error('[booking_holds] expire stale failed:', error)
  }
}

export async function createBookingHold(input: {
  supabase: SupabaseLike
  trainerId: string
  scheduledAt: string
  customerEmail: string
  stripeCheckoutSessionId?: string | null
}) {
  await expireStaleBookingHolds({
    supabase: input.supabase,
    trainerId: input.trainerId,
    scheduledAt: input.scheduledAt,
  })

  const expiresAt = new Date(Date.now() + BOOKING_HOLD_MINUTES * 60 * 1000).toISOString()
  const { data, error } = await input.supabase
    .from('booking_holds')
    .insert({
      trainer_id: input.trainerId,
      scheduled_at: input.scheduledAt,
      customer_email: input.customerEmail.trim().toLowerCase(),
      stripe_checkout_session_id: input.stripeCheckoutSessionId ?? null,
      status: 'active',
      expires_at: expiresAt,
    })
    .select('id')
    .maybeSingle()

  if (error) {
    if (isMissingBookingHoldsTable(error)) {
      throw new Error('予約保護テーブルが未設定です。Supabaseマイグレーションを適用してください')
    }
    if (isUniqueViolation(error)) {
      throw new Error('この日時は他のお客様が決済手続き中です。15分後に再度お試しください')
    }
    throw new Error(`booking_holds insert failed: ${error.message}`)
  }

  return { id: (data as { id?: string } | null)?.id ?? null, expiresAt }
}

export async function attachCheckoutSessionToBookingHold(input: {
  supabase: SupabaseLike
  holdId: string | null
  stripeCheckoutSessionId: string
}) {
  if (!input.holdId) return
  const { error } = await input.supabase
    .from('booking_holds')
    .update({ stripe_checkout_session_id: input.stripeCheckoutSessionId })
    .eq('id', input.holdId)
    .eq('status', 'active')

  if (error) {
    if (isMissingBookingHoldsTable(error)) return
    throw new Error(`booking_holds checkout attach failed: ${error.message}`)
  }
}

export async function cancelBookingHold(input: {
  supabase: SupabaseLike
  holdId: string | null
}) {
  if (!input.holdId) return
  const { error } = await input.supabase
    .from('booking_holds')
    .update({ status: 'cancelled' })
    .eq('id', input.holdId)
    .eq('status', 'active')

  if (error && !isMissingBookingHoldsTable(error)) {
    console.error('[booking_holds] cancel failed:', error)
  }
}

export async function markBookingHoldConverted(input: {
  supabase: SupabaseLike
  stripeCheckoutSessionId: string
}) {
  const { error } = await input.supabase
    .from('booking_holds')
    .update({ status: 'converted' })
    .eq('stripe_checkout_session_id', input.stripeCheckoutSessionId)
    .eq('status', 'active')

  if (error && !isMissingBookingHoldsTable(error)) {
    console.error('[booking_holds] convert failed:', error)
  }
}

export async function loadActiveBookingHoldIntervals(input: {
  supabase: SupabaseLike
  trainerId: string
  from: string
  to: string
  sessionMs: number
}) {
  const { data, error } = await input.supabase
    .from('booking_holds')
    .select('scheduled_at, expires_at')
    .eq('trainer_id', input.trainerId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .gte('scheduled_at', input.from)
    .lte('scheduled_at', input.to)

  if (error) {
    if (isMissingBookingHoldsTable(error)) return []
    throw new Error(`booking_holds select failed: ${error.message}`)
  }

  return (data ?? []).map((hold) => {
    const start = new Date(hold.scheduled_at)
    const end = new Date(start.getTime() + input.sessionMs)
    return { start, end }
  })
}
