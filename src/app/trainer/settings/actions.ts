'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  buildTrainerBioWithSettings,
  readTrainerSettingsFromBio,
  type TrainerOperationSettings,
} from '@/lib/trainer-settings'

async function getTrainerProfile() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: '認証が必要です' as const }

  const { data: profile } = await supabase
    .from('trainer_profiles')
    .select('id, bio')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) return { error: 'トレーナープロフィールが見つかりません' as const }

  return { supabase, profile }
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
  revalidatePath('/trainee/booking')
  return {}
}

export async function addMenuAction(name: string, price: number): Promise<{ error?: string }> {
  const result = await getTrainerProfile()
  if ('error' in result) return { error: result.error }
  const { supabase, profile } = result

  const trimmed = name.trim()
  if (!trimmed) return { error: 'メニュー名を入力してください' }
  if (price < 0) return { error: '価格は0円以上にしてください' }

  const { error } = await supabase.from('plans').insert({
    trainer_id: profile.id,
    name: trimmed,
    sessions: 1,
    price,
  })
  if (error) return { error: `メニュー追加に失敗しました: ${error.message}` }

  revalidatePath('/trainer/settings')
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

  revalidatePath('/trainer/settings')
  return {}
}
