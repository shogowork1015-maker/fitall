'use server'

import { revalidatePath } from 'next/cache'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  buildTrainerBioWithPlanSettings,
  buildTrainerBioWithSettings,
  getPlanSettings,
  readTrainerPlanSettingsFromBio,
  readTrainerSettingsFromBio,
  type TrainerPlanSettings,
  type TrainerOperationSettings,
} from '@/lib/trainer-settings'

async function getTrainerProfile() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !isDevAuthBypassEnabled()) return { error: '認証が必要です' as const }

  const writeSupabase = user ? supabase : createAdminSupabaseClient()
  const { data: profile } = user
    ? await writeSupabase
        .from('trainer_profiles')
        .select('id, bio')
        .eq('user_id', user.id)
        .maybeSingle()
    : await writeSupabase
        .from('trainer_profiles')
        .select('id, bio')
        .order('created_at')
        .limit(1)
        .maybeSingle()

  if (!profile) return { error: 'トレーナープロフィールが見つかりません' as const }

  return { supabase: writeSupabase, profile }
}

export async function saveOperationSettingsAction(
  settings: TrainerOperationSettings
): Promise<{ error?: string }> {
  const result = await getTrainerProfile()
  if ('error' in result) return { error: result.error }

  const { supabase, profile } = result
  const normalized = readTrainerSettingsFromBio(
    buildTrainerBioWithSettings(profile.bio, settings)
  )

  if (normalized.business_open >= normalized.business_close) {
    return { error: '営業時間: 開始は終了より前にしてください' }
  }

  const nextBio = buildTrainerBioWithSettings(profile.bio, normalized)
  const { error } = await supabase
    .from('trainer_profiles')
    .update({ bio: nextBio })
    .eq('id', profile.id)

  if (error) return { error: `保存に失敗しました: ${error.message}` }

  revalidatePath('/trainer/settings')
  revalidatePath('/trainer/availability')
  revalidatePath('/book')
  return {}
}

export interface MenuInput {
  name: string
  price: number
  sessions: number
  billing_type: 'ticket' | 'monthly'
  description: string
  is_public: boolean
}

function normalizeMenuInput(input: MenuInput) {
  return {
    name: input.name.trim(),
    price: Math.max(0, Math.floor(Number(input.price) || 0)),
    sessions: Math.max(1, Math.floor(Number(input.sessions) || 1)),
    settings: {
      billing_type: input.billing_type === 'monthly' ? 'monthly' : 'ticket',
      description: input.description.trim().slice(0, 180),
      is_public: input.is_public,
      sort_order: 0,
    } satisfies TrainerPlanSettings,
  }
}

export async function addMenuAction(input: MenuInput): Promise<{ error?: string }> {
  const result = await getTrainerProfile()
  if ('error' in result) return { error: result.error }
  const { supabase, profile } = result

  const normalized = normalizeMenuInput(input)
  if (!normalized.name) return { error: 'メニュー名を入力してください' }
  if (normalized.price < 1) return { error: '価格は1円以上にしてください' }

  const { data: insertedPlan, error } = await supabase.from('plans').insert({
    trainer_id: profile.id,
    name: normalized.name,
    sessions: normalized.sessions,
    price: normalized.price,
  }).select('id').maybeSingle()
  if (error) return { error: `メニュー追加に失敗しました: ${error.message}` }
  if (insertedPlan?.id) {
    const planSettings = readTrainerPlanSettingsFromBio(profile.bio)
    const nextSettings = {
      ...normalized.settings,
      sort_order: Object.keys(planSettings).length + 1,
    }
    const nextBio = buildTrainerBioWithPlanSettings(profile.bio, insertedPlan.id, nextSettings)
    const { error: bioError } = await supabase
      .from('trainer_profiles')
      .update({ bio: nextBio })
      .eq('id', profile.id)
    if (bioError) return { error: `メニュー設定の保存に失敗しました: ${bioError.message}` }
  }

  revalidatePath('/trainer/settings')
  revalidatePath('/book')
  return {}
}

export async function updateMenuAction(
  planId: string,
  input: MenuInput
): Promise<{ error?: string }> {
  const result = await getTrainerProfile()
  if ('error' in result) return { error: result.error }
  const { supabase, profile } = result

  const normalized = normalizeMenuInput(input)
  if (!normalized.name) return { error: 'メニュー名を入力してください' }
  if (normalized.price < 1) return { error: '価格は1円以上にしてください' }

  const { error } = await supabase
    .from('plans')
    .update({
      name: normalized.name,
      sessions: normalized.sessions,
      price: normalized.price,
    })
    .eq('id', planId)
    .eq('trainer_id', profile.id)
  if (error) return { error: `メニュー更新に失敗しました: ${error.message}` }

  const planSettings = readTrainerPlanSettingsFromBio(profile.bio)
  const current = getPlanSettings(planSettings, planId)
  const nextBio = buildTrainerBioWithPlanSettings(profile.bio, planId, {
    ...normalized.settings,
    sort_order: current.sort_order,
  })
  const { error: bioError } = await supabase
    .from('trainer_profiles')
    .update({ bio: nextBio })
    .eq('id', profile.id)
  if (bioError) return { error: `メニュー設定の保存に失敗しました: ${bioError.message}` }

  revalidatePath('/trainer/settings')
  revalidatePath('/book')
  return {}
}

export async function deleteMenuAction(planId: string): Promise<{ error?: string }> {
  const result = await getTrainerProfile()
  if ('error' in result) return { error: result.error }
  const { supabase, profile } = result

  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', planId)
    .eq('trainer_id', profile.id)
  if (error) return { error: `メニュー削除に失敗しました: ${error.message}` }

  const nextBio = buildTrainerBioWithPlanSettings(profile.bio, planId, null)
  const { error: bioError } = await supabase
    .from('trainer_profiles')
    .update({ bio: nextBio })
    .eq('id', profile.id)
  if (bioError) return { error: `メニュー設定の削除に失敗しました: ${bioError.message}` }

  revalidatePath('/trainer/settings')
  revalidatePath('/book')
  return {}
}
