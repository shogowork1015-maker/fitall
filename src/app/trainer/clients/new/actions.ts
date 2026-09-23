'use server'

import { randomUUID } from 'crypto'
import { redirect } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

export async function createClientInviteAction(formData: FormData) {
  const name = requiredString(formData, 'name', 80)
  const email = requiredString(formData, 'email', 254).toLowerCase()
  const goal = requiredString(formData, 'goal', 500)
  const height = optionalNumber(formData, 'height')
  const weight = optionalNumber(formData, 'weight')

  if (!name || !email || !EMAIL_PATTERN.test(email)) {
    redirect('/trainer/clients/new?error=invalid')
  }

  const serverSupabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await serverSupabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: trainerProfile } = await serverSupabase
    .from('trainer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!trainerProfile) {
    redirect('/trainer/clients/new?error=no-trainer')
  }

  const adminSupabase = createAdminSupabaseClient()
  let { data: customerUser } = await adminSupabase
    .from('users')
    .select('id, role')
    .eq('email', email)
    .maybeSingle()

  if (customerUser?.role && customerUser.role !== 'trainee') {
    redirect('/trainer/clients/new?error=role')
  }

  if (customerUser) {
    const { error } = await adminSupabase
      .from('users')
      .update({ name, role: 'trainee' })
      .eq('id', customerUser.id)
    if (error) redirect('/trainer/clients/new?error=save')
  } else {
    const userId = randomUUID()
    const { data: insertedUser, error } = await adminSupabase
      .from('users')
      .insert({
        id: userId,
        name,
        email,
        role: 'trainee',
      })
      .select('id, role')
      .maybeSingle()
    if (error || !insertedUser) redirect('/trainer/clients/new?error=save')
    customerUser = insertedUser
  }

  const { data: existingProfile } = await adminSupabase
    .from('trainee_profiles')
    .select('id')
    .eq('user_id', customerUser.id)
    .maybeSingle()

  const profilePayload = {
    goal: goal || null,
    height,
    weight,
  }

  let traineeProfileId = existingProfile?.id
  if (existingProfile) {
    const { error } = await adminSupabase
      .from('trainee_profiles')
      .update(profilePayload)
      .eq('id', existingProfile.id)
    if (error) redirect('/trainer/clients/new?error=save')
  } else {
    const { data: insertedProfile, error } = await adminSupabase
      .from('trainee_profiles')
      .insert({
        user_id: customerUser.id,
        ...profilePayload,
      })
      .select('id')
      .maybeSingle()
    if (error || !insertedProfile) redirect('/trainer/clients/new?error=save')
    traineeProfileId = insertedProfile.id
  }

  if (!traineeProfileId) redirect('/trainer/clients/new?error=save')

  const inviteToken = `client_${randomUUID().replace(/-/g, '')}`
  const { data: existingRelation } = await adminSupabase
    .from('trainer_trainee')
    .select('id')
    .eq('trainer_id', trainerProfile.id)
    .eq('trainee_id', traineeProfileId)
    .maybeSingle()

  if (existingRelation) {
    const { error } = await adminSupabase
      .from('trainer_trainee')
      .update({
        status: 'active',
        invite_token: inviteToken,
      })
      .eq('id', existingRelation.id)
    if (error) redirect('/trainer/clients/new?error=save')
  } else {
    const { error } = await adminSupabase.from('trainer_trainee').insert({
      trainer_id: trainerProfile.id,
      trainee_id: traineeProfileId,
      status: 'active',
      invite_token: inviteToken,
    })
    if (error) redirect('/trainer/clients/new?error=save')
  }

  redirect(`/trainer/clients/new?created=${inviteToken}`)
}
