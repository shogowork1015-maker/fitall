import { createHmac, timingSafeEqual } from 'crypto'
import { formatJstDateTime } from './datetime'

export interface CheckoutSessionInput {
  origin: string
  trainerProfileId: string
  trainerUserId: string
  trainerName: string
  planId: string
  planName: string
  billingType: 'ticket' | 'monthly'
  quantity: number
  amount: number
  scheduledAt?: string | null
  customerName: string
  customerEmail: string
  customerPhone: string
  successPath?: string
  cancelPath?: string
}

export interface StripeCheckoutSession {
  id: string
  url: string | null
}

export interface StripeCheckoutSessionDetails {
  id: string
  customer_email?: string | null
  payment_status?: string | null
  created?: number
  amount_total?: number | null
  metadata?: Record<string, string | undefined>
}

function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY が未設定です')
  }
  return key
}

function toSafeStripeError(message?: string) {
  if (!message) return 'Stripe Checkoutの作成に失敗しました'
  if (/Invalid API Key provided/i.test(message)) {
    return 'Stripeの秘密キーが正しくありません。Stripeダッシュボードでテスト用のSecret keyを再発行して設定してください。'
  }
  return message.replace(/(sk|pk|rk)_(test|live)_[A-Za-z0-9_*]+/g, '$1_$2_********')
}

function appendParam(params: URLSearchParams, key: string, value: string | number) {
  params.append(key, String(value))
}

export async function createStripeCheckoutSession(input: CheckoutSessionInput) {
  const params = new URLSearchParams()
  appendParam(params, 'mode', input.billingType === 'monthly' ? 'subscription' : 'payment')
  appendParam(
    params,
    'success_url',
    `${input.origin}${input.successPath ?? '/book/success?session_id={CHECKOUT_SESSION_ID}'}`
  )
  appendParam(
    params,
    'cancel_url',
    `${input.origin}${input.cancelPath ?? `/book/${input.trainerProfileId}?cancelled=1`}`
  )
  appendParam(params, 'customer_email', input.customerEmail)
  appendParam(params, 'line_items[0][quantity]', 1)
  appendParam(params, 'line_items[0][price_data][currency]', 'jpy')
  appendParam(params, 'line_items[0][price_data][unit_amount]', input.amount)
  if (input.billingType === 'monthly') {
    appendParam(params, 'line_items[0][price_data][recurring][interval]', 'month')
  }
  appendParam(
    params,
    'line_items[0][price_data][product_data][name]',
    `${input.trainerName} / ${input.planName}`
  )
  appendParam(
    params,
    'line_items[0][price_data][product_data][description]',
    input.scheduledAt
      ? formatJstDateTime(input.scheduledAt, {
          month: 'long',
          day: 'numeric',
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : `${input.quantity}回分のチケット`
  )

  const metadata: Record<string, string> = {
    trainer_profile_id: input.trainerProfileId,
    trainer_user_id: input.trainerUserId,
    plan_id: input.planId,
    plan_name: input.planName,
    billing_type: input.billingType,
    quantity: String(input.quantity),
    amount: String(input.amount),
    customer_name: input.customerName,
    customer_email: input.customerEmail,
    customer_phone: input.customerPhone,
  }
  if (input.scheduledAt) metadata.scheduled_at = input.scheduledAt

  for (const [key, value] of Object.entries(metadata)) {
    appendParam(params, `metadata[${key}]`, value)
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })

  const json = (await response.json()) as StripeCheckoutSession & { error?: { message?: string } }
  if (!response.ok) {
    throw new Error(toSafeStripeError(json.error?.message))
  }
  return json
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  const response = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    {
      headers: {
        Authorization: `Bearer ${getStripeSecretKey()}`,
      },
    }
  )

  const json = (await response.json()) as StripeCheckoutSessionDetails & { error?: { message?: string } }
  if (!response.ok) {
    throw new Error(toSafeStripeError(json.error?.message))
  }
  return json
}

export function verifyStripeSignature(payload: string, signature: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET が未設定です')
  if (!signature) return false

  const parts = signature.split(',').map((part) => {
    const [key, value] = part.split('=')
    return [key, value]
  })
  const timestamp = parts.find(([key]) => key === 't')?.[1]
  const signatures = parts
    .filter(([key]) => key === 'v1')
    .map(([, value]) => value)
    .filter(Boolean)
  if (!timestamp || !signatures.length) return false
  const timestampSeconds = Number(timestamp)
  if (!Number.isFinite(timestampSeconds)) return false
  if (Math.abs(Date.now() / 1000 - timestampSeconds) > 5 * 60) return false

  const signedPayload = `${timestamp}.${payload}`
  const digest = createHmac('sha256', secret).update(signedPayload).digest('hex')
  const digestBuffer = Buffer.from(digest)
  return signatures.some((expected) => {
    const expectedBuffer = Buffer.from(expected)
    return digestBuffer.length === expectedBuffer.length && timingSafeEqual(digestBuffer, expectedBuffer)
  })
}
