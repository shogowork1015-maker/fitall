'use server'

import { randomUUID } from 'crypto'
import { redirect } from 'next/navigation'
import { setCustomerSessionCookieValue } from '@/lib/customer-session'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TOKEN_PATTERN = /^[a-zA-Z0-9_-]{8,120}$/

function requiredString(formData: FormData, key: string, maxLength = 200) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function optionalNumber(formData: FormData, key: string) {
  const value = requiredString(formData, key, 16)
  if (!value) return null
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

export async function completeCustomerOnboardingAction(token: string, formData: FormData) {
  if (!TOKEN_PATTERN.test(token)) {
    redirect('/customer/app?entry=invalid')
  }

  const name = requiredString(formData, 'name', 80)
  const email = requiredString(formData, 'email', 254).toLowerCase()
  const goal = requiredString(formData, 'goal', 500)
  const height = optionalNumber(formData, 'height')
  const weight = optionalNumber(formData, 'weight')

  if (!name || !email || !EMAIL_PATTERN.test(email)) {
    redirect(`/customer/onboarding/${token}?error=invalid`)
  }

  const supabase = createAdminSupabaseClient()
  const { data: relation } = await supabase
    .from('trainer_trainee')
    .select('id, trainer_id, trainee_id')
    .eq('invite_token', token)
    .maybeSingle()

  if (!relation) {
    redirect('/customer/app?entry=invalid')
  }

  let customerUserId: string | null = null
  let traineeProfileId: string | null = relation.trainee_id ?? null

  if (traineeProfileId) {
    const { data: profile } = await supabase
      .from('trainee_profiles')
      .select('id, user_id')
      .eq('id', traineeProfileId)
      .maybeSingle()
    customerUserId = profile?.user_id ?? null
  }

  if (!customerUserId) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', email)
      .maybeSingle()

    if (existingUser?.role && existingUser.role !== 'trainee') {
      redirect(`/customer/onboarding/${token}?error=role`)
    }

    if (existingUser) {
      customerUserId = existingUser.id
    } else {
      customerUserId = randomUUID()
      const { error } = await supabase.from('users').insert({
        id: customerUserId,
        name,
        email,
        role: 'trainee',
      })
      if (error) redirect(`/customer/onboarding/${token}?error=save`)
    }
  }

  const { error: userError } = await supabase
    .from('users')
    .update({ name, email, role: 'trainee' })
    .eq('id', customerUserId)
  if (userError) redirect(`/customer/onboarding/${token}?error=save`)

  const profilePayload = {
    goal: goal || null,
    height,
    weight,
  }

  if (traineeProfileId) {
    const { error } = await supabase
      .from('trainee_profiles')
      .update(profilePayload)
      .eq('id', traineeProfileId)
    if (error) redirect(`/customer/onboarding/${token}?error=save`)
  } else {
    const { data: insertedProfile, error } = await supabase
      .from('trainee_profiles')
      .insert({
        user_id: customerUserId,
        ...profilePayload,
      })
      .select('id')
      .maybeSingle()
    if (error || !insertedProfile) redirect(`/customer/onboarding/${token}?error=save`)
    traineeProfileId = insertedProfile.id
  }

  const { error: relationError } = await supabase
    .from('trainer_trainee')
    .update({
      trainee_id: traineeProfileId,
      status: 'active',
    })
    .eq('id', relation.id)
  if (relationError) redirect(`/customer/onboarding/${token}?error=save`)
  if (!customerUserId) redirect(`/customer/onboarding/${token}?error=save`)

  await setCustomerSessionCookieValue(customerUserId)
  redirect('/api/line/customer-connect/start?from=onboarding')
}
