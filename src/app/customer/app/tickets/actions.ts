'use server'

import { headers } from 'next/headers'
import { loadCustomerAppMutationContext } from '@/lib/customer-app'
import { createStripeCheckoutSession } from '@/lib/stripe'
import {
  getPlanSettings,
  readTrainerPlanSettingsFromBio,
  type TrainerPlanBillingType,
} from '@/lib/trainer-settings'

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/
export type CustomerTicketCheckoutState = { error: string } | { checkoutUrl: string } | null

function requiredString(formData: FormData, key: string, maxLength = 200) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

async function getOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (configured) return configured.replace(/\/$/, '')
  const h = await headers()
  const host = h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

function inferBillingType(name: string, sessions: number): TrainerPlanBillingType {
  if (name.includes('月') || name.includes('月謝')) return 'monthly'
  return sessions > 1 ? 'ticket' : 'ticket'
}

export async function createCustomerTicketCheckoutAction(
  _prevState: CustomerTicketCheckoutState,
  formData: FormData
): Promise<CustomerTicketCheckoutState> {
  const planId = requiredString(formData, 'plan_id', 64)
  if (!planId || !SAFE_ID_PATTERN.test(planId)) {
    return { error: 'メニュー情報が正しくありません。' }
  }

  const context = await loadCustomerAppMutationContext()
  if (!context) {
    return { error: 'マイページ登録後に購入できます。' }
  }

  const { supabase, customerUser, trainerProfile, trainerUser } = context
  const { data: plan } = await supabase
    .from('plans')
    .select('id, name, price, sessions')
    .eq('id', planId)
    .eq('trainer_id', trainerProfile.id)
    .maybeSingle()

  if (!plan) {
    return { error: 'メニューが見つかりません。' }
  }

  const planSettings = readTrainerPlanSettingsFromBio(trainerProfile.bio)
  const meta = getPlanSettings(planSettings, plan.id, {
    billing_type: inferBillingType(plan.name, plan.sessions ?? 1),
  })

  if (!meta.is_public || meta.billing_type !== 'ticket' || plan.price <= 0) {
    return { error: 'このメニューは現在購入できません。' }
  }

  let checkoutUrl: string | null = null
  try {
    const session = await createStripeCheckoutSession({
      origin: await getOrigin(),
      trainerProfileId: trainerProfile.id,
      trainerUserId: trainerProfile.user_id,
      trainerName: trainerUser?.name ?? 'トレーナー',
      planId: plan.id,
      planName: plan.name,
      billingType: meta.billing_type,
      quantity: plan.sessions ?? 1,
      amount: plan.price,
      customerName: customerUser.name ?? 'お客様',
      customerEmail: customerUser.email ?? '',
      customerPhone: '',
      successPath: '/customer/app/tickets?purchase=success&session_id={CHECKOUT_SESSION_ID}',
      cancelPath: '/customer/app/tickets?purchase=cancelled',
    })
    checkoutUrl = session.url
  } catch (error) {
    console.error('[createCustomerTicketCheckoutAction]', error)
    return { error: 'Stripe決済ページの作成に失敗しました。設定を確認してください。' }
  }

  if (!checkoutUrl) {
    return { error: 'Stripe決済ページの作成に失敗しました。設定を確認してください。' }
  }

  return { checkoutUrl }
}
