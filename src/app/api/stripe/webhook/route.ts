import { randomUUID } from 'crypto'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { markBookingHoldConverted } from '@/lib/booking-holds'
import { findTrainerBookingOverlap } from '@/lib/booking-overlap'
import { sendBookingConfirmationNotifications } from '@/lib/booking-notifications'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import {
  attachFirstAvailableCreditToBooking,
  ensureCreditPurchase,
  ensureCreditsForPurchase,
  planSessionQuantity,
} from '@/lib/session-credits'
import { verifyStripeSignature } from '@/lib/stripe'

interface CheckoutSessionCompletedEvent {
  type: 'checkout.session.completed'
  data: {
    object: {
      id: string
      payment_status?: string
      payment_intent?: string
      amount_total?: number | null
      metadata?: Record<string, string | undefined>
    }
  }
}

const MAX_STRIPE_WEBHOOK_BYTES = 1024 * 1024

function requiredMetadata(metadata: Record<string, string | undefined> | undefined, key: string) {
  const value = metadata?.[key]
  if (!value) throw new Error(`Stripe metadata ${key} is missing`)
  return value
}

function isMissingCreditStorageError(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  return (
    message.includes('session_credit_purchases') ||
    message.includes('session_credits') ||
    message.includes('schema cache')
  )
}

function isUniqueViolation(error: { code?: string } | null | undefined) {
  return error?.code === '23505'
}

function adjustmentTimestamp(baseIso: string, offsetMinutes: number) {
  const base = new Date(baseIso)
  return new Date(base.getTime() + offsetMinutes * 60 * 1000).toISOString()
}

async function insertBookingWithAdjustmentFallback(input: {
  supabase: ReturnType<typeof createAdminSupabaseClient>
  trainerId: string
  traineeId: string
  scheduledAt: string
  amount: number
  requiresTrainerAdjustment: boolean
  sessionMinutes: number
}) {
  const insertBooking = async (scheduledAt: string, status: 'pending' | 'confirmed') => {
    const { data, error } = await input.supabase
      .from('bookings')
      .insert({
        trainer_id: input.trainerId,
        trainee_id: input.traineeId,
        scheduled_at: scheduledAt,
        status,
        price: input.amount,
      })
      .select('id')
      .maybeSingle()

    return { data: data as { id?: string } | null, error }
  }

  const firstStatus = input.requiresTrainerAdjustment ? 'pending' : 'confirmed'
  const first = await insertBooking(input.scheduledAt, firstStatus)
  if (!first.error && first.data?.id) {
    return {
      bookingId: first.data.id,
      requiresTrainerAdjustment: input.requiresTrainerAdjustment,
    }
  }

  if (!isUniqueViolation(first.error)) {
    throw new Error(`bookings insert failed: ${first.error?.message ?? 'unknown'}`)
  }

  for (let minute = 1; minute <= input.sessionMinutes; minute += 1) {
    const fallback = await insertBooking(adjustmentTimestamp(input.scheduledAt, minute), 'pending')
    if (!fallback.error && fallback.data?.id) {
      return { bookingId: fallback.data.id, requiresTrainerAdjustment: true }
    }
    if (fallback.error && !isUniqueViolation(fallback.error)) {
      throw new Error(`bookings adjustment insert failed: ${fallback.error.message}`)
    }
  }

  throw new Error('bookings insert failed: no adjustment slot available')
}

async function ensureCustomerProfile(input: {
  name: string
  email: string
  trainerProfileId: string
}) {
  const supabase = createAdminSupabaseClient()
  const normalizedEmail = input.email.trim().toLowerCase()

  let { data: userRow } = await supabase
    .from('users')
    .select('id, name')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (!userRow) {
    const userId = randomUUID()
    const { data: insertedUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        name: input.name,
        email: normalizedEmail,
        role: 'trainee',
      })
      .select('id, name')
      .maybeSingle()

    if (userError || !insertedUser) {
      throw new Error(`users insert failed: ${userError?.message ?? 'unknown'}`)
    }
    userRow = insertedUser
  }

  let { data: traineeProfile } = await supabase
    .from('trainee_profiles')
    .select('id')
    .eq('user_id', userRow.id)
    .maybeSingle()

  if (!traineeProfile) {
    const { data: insertedProfile, error: profileError } = await supabase
      .from('trainee_profiles')
      .insert({ user_id: userRow.id })
      .select('id')
      .maybeSingle()

    if (profileError || !insertedProfile) {
      throw new Error(`trainee_profiles insert failed: ${profileError?.message ?? 'unknown'}`)
    }
    traineeProfile = insertedProfile
  }

  const { data: existingRelation } = await supabase
    .from('trainer_trainee')
    .select('id')
    .eq('trainer_id', input.trainerProfileId)
    .eq('trainee_id', traineeProfile.id)
    .maybeSingle()

  if (!existingRelation) {
    const { error: relationError } = await supabase.from('trainer_trainee').insert({
      trainer_id: input.trainerProfileId,
      trainee_id: traineeProfile.id,
      status: 'active',
      invite_token: `stripe_${randomUUID().replace(/-/g, '')}`,
    })

    if (relationError) {
      throw new Error(`trainer_trainee insert failed: ${relationError.message}`)
    }
  }

  return { userId: userRow.id, traineeProfileId: traineeProfile.id }
}

async function createBookingFromCheckout(event: CheckoutSessionCompletedEvent) {
  const supabase = createAdminSupabaseClient()
  const session = event.data.object
  const metadata = session.metadata

  if (session.payment_status && session.payment_status !== 'paid') {
    return
  }

  const trainerProfileId = requiredMetadata(metadata, 'trainer_profile_id')
  const scheduledAt = metadata?.scheduled_at
  const customerName = requiredMetadata(metadata, 'customer_name')
  const customerEmail = requiredMetadata(metadata, 'customer_email')
  const customerPhone = metadata?.customer_phone ?? ''
  const planIdRaw = metadata?.plan_id ?? null
  const planId = planIdRaw || null
  const planName = metadata?.plan_name ?? 'パーソナルトレーニング'
  const amount = Number(requiredMetadata(metadata, 'amount'))
  const quantity = planSessionQuantity(metadata?.quantity)

  if (!Number.isFinite(amount) || amount < 1) {
    throw new Error('Stripe metadata amount is invalid')
  }
  if (typeof session.amount_total === 'number' && session.amount_total !== amount) {
    throw new Error('Stripe amount does not match metadata amount')
  }

  const { userId: customerUserId, traineeProfileId } = await ensureCustomerProfile({
    name: customerName,
    email: customerEmail,
    trainerProfileId,
  })

  let purchaseId: string | null = null
  try {
    purchaseId = await ensureCreditPurchase({
      supabase,
      trainerId: trainerProfileId,
      traineeId: traineeProfileId,
      planId,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.payment_intent ?? null,
      amount,
      quantity,
    })

    await ensureCreditsForPurchase({
      supabase,
      purchaseId,
      trainerId: trainerProfileId,
      traineeId: traineeProfileId,
      quantity,
    })
  } catch (error) {
    // Ticket-only purchases must never acknowledge payment without issuing credits.
    if (!scheduledAt || !isMissingCreditStorageError(error)) throw error
    console.error('[stripe webhook] session credit storage is missing; booking will continue')
  }

  if (!scheduledAt) {
    return
  }

  const { data: trainerProfile } = await supabase
    .from('trainer_profiles')
    .select('id, user_id, bio')
    .eq('id', trainerProfileId)
    .maybeSingle()

  const { data: trainerUser } = trainerProfile
    ? await supabase
        .from('users')
        .select('name, email, line_user_id')
        .eq('id', trainerProfile.user_id)
        .maybeSingle()
    : { data: null }

  const { data: customerUser } = await supabase
    .from('users')
    .select('name, email, line_user_id')
    .eq('id', customerUserId)
    .maybeSingle()

  const { data: existingBooking } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('trainer_id', trainerProfileId)
    .eq('trainee_id', traineeProfileId)
    .eq('scheduled_at', scheduledAt)
    .maybeSingle()

  let bookingId = existingBooking?.id
  let requiresTrainerAdjustment = existingBooking?.status === 'pending'
  if (!bookingId) {
    const overlap = await findTrainerBookingOverlap({
      supabase,
      trainerId: trainerProfileId,
      trainerBio: trainerProfile?.bio,
      scheduledAt,
    })
    requiresTrainerAdjustment = overlap.overlaps

    const inserted = await insertBookingWithAdjustmentFallback({
      supabase,
      trainerId: trainerProfileId,
      traineeId: traineeProfileId,
      scheduledAt,
      amount,
      requiresTrainerAdjustment,
      sessionMinutes: Math.max(1, Math.floor(overlap.sessionMs / 60_000)),
    })
    bookingId = inserted.bookingId
    requiresTrainerAdjustment = inserted.requiresTrainerAdjustment
  }

  await markBookingHoldConverted({
    supabase,
    stripeCheckoutSessionId: session.id,
  })

  if (purchaseId) {
    await attachFirstAvailableCreditToBooking({
      supabase,
      purchaseId,
      bookingId,
    })
  }

  const { data: existingSale } = await supabase
    .from('sales_records')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle()

  let shouldSendNotification = false
  if (!existingSale) {
    const { error: salesError } = await supabase.from('sales_records').insert({
      trainer_id: trainerProfileId,
      booking_id: bookingId,
      amount,
      payment_method: 'stripe',
      paid_at: new Date().toISOString(),
    })
    if (salesError && !isUniqueViolation(salesError)) {
      throw new Error(`sales_records insert failed: ${salesError.message}`)
    }
    shouldSendNotification = !salesError
  }

  if (!shouldSendNotification) return

  await sendBookingConfirmationNotifications({
    scheduledAt,
    customer: {
      name: customerUser?.name ?? customerName,
      email: customerUser?.email ?? customerEmail,
      line_user_id: customerUser?.line_user_id,
    },
    trainer: trainerUser,
    planName,
    quantity,
    amount,
    customerPhone,
    requiresTrainerAdjustment,
  })
}

export async function POST(request: Request) {
  const requestHeaders = await headers()
  const contentLength = Number(requestHeaders.get('content-length') ?? '0')
  if (Number.isFinite(contentLength) && contentLength > MAX_STRIPE_WEBHOOK_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  const payload = await request.text()
  const signature = requestHeaders.get('stripe-signature')

  try {
    if (!verifyStripeSignature(payload, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(payload) as CheckoutSessionCompletedEvent
    if (event.type === 'checkout.session.completed') {
      await createBookingFromCheckout(event)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[stripe webhook]', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
