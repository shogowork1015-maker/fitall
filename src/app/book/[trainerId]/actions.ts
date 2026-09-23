'use server'

import { headers } from 'next/headers'
import {
  attachCheckoutSessionToBookingHold,
  cancelBookingHold,
  createBookingHold,
} from '@/lib/booking-holds'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { createStripeCheckoutSession } from '@/lib/stripe'
import { getPublicBookingData, isPublicSlotAvailable } from '@/lib/public-booking'

export type PublicBookingState = { error: string } | { checkoutUrl: string } | null

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function requiredString(formData: FormData, key: string, maxLength = 200) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase().slice(0, 254)
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+\-()\s]/g, '').trim().slice(0, 32)
}

function normalizeIsoDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

function publicBookingError(error: unknown) {
  if (!(error instanceof Error)) return '決済ページの作成に失敗しました。少し時間をおいて再度お試しください。'
  if (
    error.message.includes('Stripeの秘密キー') ||
    error.message.includes('Stripe Checkout') ||
    error.message.includes('決済') ||
    error.message.includes('決済手続き中') ||
    error.message.includes('予約保護テーブル')
  ) {
    return error.message
  }
  return '決済ページの作成に失敗しました。少し時間をおいて再度お試しください。'
}

function getOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (configured) return configured.replace(/\/$/, '')
  return headers().then((h) => {
    const host = h.get('host')
    const proto = h.get('x-forwarded-proto') ?? 'http'
    return `${proto}://${host}`
  })
}

export async function createPublicBookingCheckoutAction(
  _prevState: PublicBookingState,
  formData: FormData
): Promise<PublicBookingState> {
  const trainerId = requiredString(formData, 'trainer_id', 64)
  const planId = requiredString(formData, 'plan_id', 64)
  const scheduledAt = normalizeIsoDate(requiredString(formData, 'scheduled_at', 64))
  const customerName = requiredString(formData, 'customer_name', 80)
  const customerEmail = normalizeEmail(requiredString(formData, 'customer_email', 254))
  const customerPhone = normalizePhone(requiredString(formData, 'customer_phone', 48))

  if (!trainerId || !planId || !scheduledAt || !customerName || !customerEmail) {
    return { error: 'お名前、メールアドレス、メニュー、日時を入力してください' }
  }
  if (!SAFE_ID_PATTERN.test(trainerId) || !SAFE_ID_PATTERN.test(planId)) {
    return { error: '予約ページの情報が正しくありません。リンクを開き直してください' }
  }
  if (!EMAIL_PATTERN.test(customerEmail)) {
    return { error: 'メールアドレスの形式を確認してください' }
  }
  if (new Date(scheduledAt) <= new Date()) {
    return { error: '過去の日時は予約できません' }
  }

  const bookingData = await getPublicBookingData(trainerId)
  if (!bookingData) return { error: '予約ページが見つかりません' }

  const menu = bookingData.menus.find((m) => m.id === planId)
  if (!menu) return { error: 'メニューが見つかりません' }
  if (menu.billing_type === 'monthly') {
    return { error: '月謝メニューは準備中です。現在は回数券のみ購入できます' }
  }
  if (menu.price <= 0) return { error: 'このメニューは決済金額が未設定です' }

  const available = await isPublicSlotAvailable(trainerId, scheduledAt)
  if (!available) return { error: 'この日時はすでに埋まっているか、受付時間外です' }

  const supabase = createAdminSupabaseClient()
  let hold: Awaited<ReturnType<typeof createBookingHold>> | null = null
  let checkoutUrl: string | null = null

  try {
    hold = await createBookingHold({
      supabase,
      trainerId: bookingData.trainer.profileId,
      scheduledAt,
      customerEmail,
      stripeCheckoutSessionId: null,
    })

    const session = await createStripeCheckoutSession({
      origin: await getOrigin(),
      trainerProfileId: bookingData.trainer.profileId,
      trainerUserId: bookingData.trainer.userId,
      trainerName: bookingData.trainer.name,
      planId: menu.id,
      planName: menu.name,
      billingType: menu.billing_type,
      quantity: menu.sessions,
      amount: menu.price,
      scheduledAt,
      customerName,
      customerEmail,
      customerPhone,
    })

    if (!session.url) {
      await cancelBookingHold({ supabase, holdId: hold?.id ?? null })
      return { error: 'Stripe Checkout URLの取得に失敗しました' }
    }

    try {
      await attachCheckoutSessionToBookingHold({
        supabase,
        holdId: hold?.id ?? null,
        stripeCheckoutSessionId: session.id,
      })
    } catch (error) {
      await cancelBookingHold({ supabase, holdId: hold?.id ?? null })
      throw error
    }
    checkoutUrl = session.url
  } catch (error) {
    await cancelBookingHold({ supabase, holdId: hold?.id ?? null })
    console.error('[createPublicBookingCheckoutAction]', error)
    return { error: publicBookingError(error) }
  }

  if (!checkoutUrl) return { error: 'Stripe Checkout URLの取得に失敗しました' }
  return { checkoutUrl }
}
