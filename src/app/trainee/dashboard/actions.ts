'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export type BodyRecordState = { error: string } | { success: true } | null

export async function saveBodyRecordAction(
  _prevState: BodyRecordState,
  formData: FormData
): Promise<BodyRecordState> {
  const weightStr = formData.get('weight_kg') as string
  const bodyFatStr = formData.get('body_fat_pct') as string

  if (!weightStr) return { error: '体重を入力してください' }

  const weight = parseFloat(weightStr)
  if (isNaN(weight) || weight <= 0) return { error: '正しい体重を入力してください' }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  // body_records は trainee_profiles.id を参照する。
  // 既存データ互換のため、同一ユーザーに複数プロフィールがある場合は
  // 「active な trainer_trainee に紐づく ID」を優先して保存先にする。
  const { data: traineeProfiles } = await supabase
    .from('trainee_profiles')
    .select('id')
    .eq('user_id', user.id)

  let selectedProfileId = traineeProfiles?.[0]?.id ?? null
  const profileIds = (traineeProfiles ?? []).map((p) => p.id)

  if (profileIds.length > 1) {
    const { data: activeRelation } = await supabase
      .from('trainer_trainee')
      .select('trainee_id')
      .in('trainee_id', profileIds)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    if (activeRelation?.trainee_id) {
      selectedProfileId = activeRelation.trainee_id
    }
  }

  if (!selectedProfileId) {
    const { data: created, error: createErr } = await supabase
      .from('trainee_profiles')
      .insert({ user_id: user.id })
      .select('id')
      .maybeSingle()
    if (createErr || !created) {
      console.error('[saveBodyRecord] trainee_profiles:', createErr)
      return { error: 'プロフィールの準備に失敗しました' }
    }
    selectedProfileId = created.id
  }

  const record: Record<string, unknown> = {
    trainee_id: selectedProfileId,
    weight_kg: weight,
    recorded_at: new Date().toISOString(),
  }

  if (bodyFatStr) {
    const bodyFat = parseFloat(bodyFatStr)
    if (!isNaN(bodyFat)) record.body_fat_pct = bodyFat
  }

  const { error } = await supabase.from('body_records').insert(record)
  if (error) {
    console.error('[saveBodyRecord]', error)
    return { error: '保存に失敗しました' }
  }

  revalidatePath('/trainee/dashboard')
  return { success: true }
}
