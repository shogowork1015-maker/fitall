'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { randomUUID } from 'crypto'

export type CreateInviteResult =
  | { id: string; invite_token: string; status: string; created_at: string }
  | { error: string }

/**
 * 同じメールで別 UUID の public.users が残っているとき、
 * users の PK を差し替える前に子テーブルを現在の auth.uid() へ付け替える（FK 23503 対策）
 */
async function reassignDbUserIdToAuthUser(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  oldUserId: string,
  newUserId: string
): Promise<{ error: string } | null> {
  const tables: { table: string; column: string }[] = [
    { table: 'trainer_profiles', column: 'user_id' },
    { table: 'trainee_profiles', column: 'user_id' },
    { table: 'bookings', column: 'trainer_id' },
    { table: 'bookings', column: 'trainee_id' },
    { table: 'sales_records', column: 'trainer_id' },
    { table: 'workout_logs', column: 'trainee_id' },
  ]

  for (const { table, column } of tables) {
    const { error } = await supabase.from(table).update({ [column]: newUserId }).eq(column, oldUserId)
    if (error) {
      console.error(`[createInviteAction] reassign ${table}.${column}:`, error)
      return {
        error: `アカウントの紐付け更新に失敗しました（${table}）。サポートへお問い合わせください。`,
      }
    }
  }

  const { error: deleteError } = await supabase.from('users').delete().eq('id', oldUserId)
  if (deleteError) {
    console.error('[createInviteAction] delete old users row:', deleteError)
    return { error: `古いユーザー行の削除に失敗しました: ${deleteError.message}` }
  }

  return null
}

// 招待リンクを新規生成する
export async function createInviteAction(): Promise<CreateInviteResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: '認証が必要です' }

  // public.users にレコードが存在するか確認する
  // （登録時の INSERT が RLS などで失敗していた場合、ここで自動補修する）
  const { data: publicUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!publicUser) {
    // auth.users には存在するが public.users には存在しない（またはRLSで読めない）→ upsert で補修
    const userData = {
      id: user.id,
      name: user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'トレーナー',
      email: user.email ?? '',
      role: 'trainer' as const,
    }
    const { error: upsertError } = await supabase.from('users').upsert(userData)

    if (upsertError) {
      if (upsertError.code === '23505' && user.email) {
        // メール重複: users の id を upsert だけで差し替えると trainer_profiles などの FK で失敗するため、先に子を付け替える
        const { data: existingByEmail } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .maybeSingle()

        if (!existingByEmail || existingByEmail.id === user.id) {
          console.error('[createInviteAction] duplicate email but no other row:', upsertError)
          return {
            error: `ユーザー情報の修復に失敗しました: ${upsertError.message}`,
          }
        }

        const reassignErr = await reassignDbUserIdToAuthUser(supabase, existingByEmail.id, user.id)
        if (reassignErr) return reassignErr

        const { error: insertError } = await supabase.from('users').insert(userData)
        if (insertError) {
          console.error('[createInviteAction] users insert after reassign:', insertError)
          return { error: `ユーザー情報の修復に失敗しました: ${insertError.message}` }
        }
      } else {
        console.error('[createInviteAction] users upsert error:', upsertError)
        return {
          error: `ユーザー情報の修復に失敗しました: ${upsertError.message}`,
        }
      }
    }
  }

  // trainer_profiles の存在を保証し、ID を取得する
  // （trainer_trainee.trainer_id FK が trainer_profiles.id を参照しているため）
  let { data: trainerProfileRecord } = await supabase
    .from('trainer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!trainerProfileRecord) {
    const { error: profileInsertError } = await supabase
      .from('trainer_profiles')
      .insert({ user_id: user.id, price_per_session: 0 })

    if (profileInsertError) {
      return {
        error: `トレーナープロフィールの作成に失敗しました: ${profileInsertError.message}`,
      }
    }

    // 作成後に再取得
    const { data: refetched } = await supabase
      .from('trainer_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    trainerProfileRecord = refetched
  }

  if (!trainerProfileRecord) {
    return { error: 'プロフィール情報の取得に失敗しました' }
  }

  const token = randomUUID().replace(/-/g, '')

  // trainer_trainee.trainer_id は trainer_profiles.id（PK）を参照する
  const { data, error } = await supabase
    .from('trainer_trainee')
    .insert({
      trainer_id: trainerProfileRecord.id,
      invite_token: token,
      status: 'pending',
      trainee_id: null,
    })
    .select('id, invite_token, status, created_at')
    .maybeSingle()

  if (error || !data) {
    console.error('[createInviteAction] trainer_trainee insert error:', error)
    return { error: `招待リンクの作成に失敗しました: ${error?.message ?? '不明なエラー'}` }
  }

  return data
}
