'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { UserRole } from '@/types/database'
import { redirect } from 'next/navigation'

export type LoginState = { error: string } | null

function roleFromUserMetadata(user: {
  user_metadata?: Record<string, unknown>
}): UserRole | null {
  const r = user.user_metadata?.role
  if (r === 'trainer' || r === 'trainee') return r
  return null
}

function displayNameFromAuth(user: {
  email?: string | null
  user_metadata?: Record<string, unknown>
}): string {
  const nameFromMeta = user.user_metadata?.name
  if (typeof nameFromMeta === 'string' && nameFromMeta.length > 0) return nameFromMeta
  return user.email?.split('@')[0] ?? 'ユーザー'
}

/** public.users の role を取得。JWT の user_metadata を最優先（RLS で DB が読めない場合の対策） */
async function resolveRoleAfterAuth(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  authedUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }
): Promise<{ role: UserRole } | { error: string }> {
  // 1) 登録時に signUp options.data で入れた role（JWT に含まれる）
  const metaRole = roleFromUserMetadata(authedUser)
  if (metaRole) {
    const { error: syncErr } = await supabase.from('users').upsert(
      {
        id: authedUser.id,
        email: authedUser.email ?? '',
        name: displayNameFromAuth(authedUser),
        role: metaRole,
      },
      { onConflict: 'id' }
    )
    if (syncErr) {
      console.warn('[loginAction] users sync (metadata path):', syncErr.message)
    }
    return { role: metaRole }
  }

  // 2) 招待登録のダミーメールはトレーニー扱い（古いアカウントで metadata が無い場合）
  if (authedUser.email?.endsWith('@fitall-trainee.app')) {
    const { error: syncErr } = await supabase.from('users').upsert(
      {
        id: authedUser.id,
        email: authedUser.email ?? '',
        name: displayNameFromAuth(authedUser),
        role: 'trainee',
      },
      { onConflict: 'id' }
    )
    if (syncErr) {
      console.warn('[loginAction] users sync (trainee email):', syncErr.message)
    }
    return { role: 'trainee' }
  }

  const { data: userData, error: usersError } = await supabase
    .from('users')
    .select('role')
    .eq('id', authedUser.id)
    .maybeSingle()

  if (usersError) {
    console.error('[loginAction] users:', usersError)
    return { error: 'ユーザー情報の取得に失敗しました' }
  }

  if (userData?.role === 'trainer' || userData?.role === 'trainee') {
    return { role: userData.role }
  }

  const { data: trainerProfile } = await supabase
    .from('trainer_profiles')
    .select('id')
    .eq('user_id', authedUser.id)
    .maybeSingle()

  const { data: traineeProfile } = await supabase
    .from('trainee_profiles')
    .select('id')
    .eq('user_id', authedUser.id)
    .maybeSingle()

  const inferredRole: UserRole | null = trainerProfile
    ? 'trainer'
    : traineeProfile
      ? 'trainee'
      : null

  if (!inferredRole) {
    console.error(
      '[loginAction] ロール判定不可: public.users / trainer_profiles / trainee_profiles が空、かつ JWT に role なし。Supabase の Authentication → user_metadata に role を追加するか RLS を確認してください。'
    )
    return {
      error:
        'アカウントの種別を判定できませんでした。お手数ですが一度サインアウトし、問題が続く場合はサポートへお問い合わせください。',
    }
  }

  const { error: upsertError } = await supabase.from('users').upsert(
    {
      id: authedUser.id,
      email: authedUser.email ?? '',
      name: displayNameFromAuth(authedUser),
      role: inferredRole,
    },
    { onConflict: 'id' }
  )

  if (upsertError) {
    console.error('[loginAction] users upsert:', upsertError)
    return { error: 'ユーザー情報の取得に失敗しました' }
  }

  return { role: inferredRole }
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'メールアドレスとパスワードを入力してください' }
  }

  const supabase = await createServerSupabaseClient()

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.user || !authData.session) {
    return { error: 'メールアドレスまたはパスワードが間違っています' }
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token,
  })
  if (sessionError) {
    console.error('[loginAction] setSession:', sessionError)
    return { error: 'セッションの確立に失敗しました。もう一度お試しください。' }
  }

  const { data: getUserData, error: getUserError } = await supabase.auth.getUser()
  // getUser が失敗しても signIn 済みユーザーがいれば続行（同一リクエスト内の一時不整合対策）
  const authedUser = getUserData.user ?? authData.user
  if (!authedUser) {
    console.error('[loginAction] getUser:', getUserError)
    return { error: 'ユーザー情報の取得に失敗しました' }
  }
  if (getUserError && !getUserData.user) {
    console.warn('[loginAction] getUser failed, using signIn user:', getUserError.message)
  }

  const resolved = await resolveRoleAfterAuth(supabase, authedUser)
  if ('error' in resolved) {
    return { error: resolved.error }
  }

  if (resolved.role === 'trainer') {
    redirect('/trainer/dashboard')
  }

  redirect('/auth/login?trainerOnly=1')
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
