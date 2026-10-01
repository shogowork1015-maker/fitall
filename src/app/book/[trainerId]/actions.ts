'use server'

import { headers } from 'next/headers'
import { createStripeCheckoutSession } from '@/lib/stripe'
import { getPublicBookingData } from '@/lib/public-booking'

export type PublicBookingState = { error: string } | { checkoutUrl: string } | null
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function requiredString(formData: FormData, key: string, maxLength = 200) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}
async function getOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (configured) return configured.replace(/\/$/, '')
  const h = await headers()
  return `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`
}

// A purchase adds credits only. A booking is made separately using those credits.
export async function createPublicBookingCheckoutAction(
  _prevState: PublicBookingState, formData: FormData
): Promise<PublicBookingState> {
  const trainerId = requiredString(formData, 'trainer_id', 64)
  const planId = requiredString(formData, 'plan_id', 64)
  const customerName = requiredString(formData, 'customer_name', 80)
  const customerEmail = requiredString(formData, 'customer_email', 254).toLowerCase()
  if (!trainerId || !planId || !customerName || !customerEmail) return { error: 'お名前、メールアドレス、メニューを入力してください' }
  if (!SAFE_ID_PATTERN.test(trainerId) || !SAFE_ID_PATTERN.test(planId)) return { error: '購入ページの情報が正しくありません。リンクを開き直してください' }
  if (!EMAIL_PATTERN.test(customerEmail)) return { error: 'メールアドレスの形式を確認してください' }
  try {
    const data = await getPublicBookingData(trainerId)
    if (!data) return { error: '購入ページが見つかりません' }
    const menu = data.menus.find(item => item.id === planId)
    if (!menu || menu.billing_type !== 'ticket' || menu.price <= 0) return { error: 'このメニューは現在購入できません' }
    const session = await createStripeCheckoutSession({
      origin: await getOrigin(), trainerProfileId: data.trainer.profileId,
      trainerUserId: data.trainer.userId, trainerName: data.trainer.name,
      planId: menu.id, planName: menu.name, billingType: menu.billing_type,
      quantity: menu.sessions, amount: menu.price, customerName, customerEmail, customerPhone: '',
    })
    return session.url ? { checkoutUrl: session.url } : { error: '決済画面を開けませんでした。もう一度お試しください。' }
  } catch {
    return { error: '決済画面を開けませんでした。少し時間をおいて再度お試しください。' }
  }
}
