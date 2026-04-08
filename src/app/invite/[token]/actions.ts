'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export type InviteRegisterState = { error: string } | null

export async function inviteRegisterAction(
  token: string,
  _prevState: InviteRegisterState,
  formData: FormData
): Promise<InviteRegisterState> {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!name || !email || !password) {
    return { error: '名前・メールアドレス・パスワードを入力してください' }
  }

  if (password.length < 8) {
    return { error: 'パスワードは8文字以上で設定してください' }
  }

  const supabase = await createServerSupabaseClient()

  // 招待トークンからtrainer_traineeレコードを取得
  const { data: invite, error: inviteError } = await supabase
    .from('trainer_trainee')
    .select('id, trainer_id, status')
    .eq('invite_token', token)
    .maybeSingle()

  if (inviteError || !invite) {
    return { error: '招待リンクが無効です' }
  }

  if (invite.status === 'active') {
    return { error: 'この招待リンクはすでに使用済みです' }
  }

  // Supabase Authでアカウント作成（user_metadata に role を載せる）
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: 'trainee',
      },
    },
  })

  if (authError || !authData.user) {
    return { error: authError?.message ?? '登録に失敗しました' }
  }

  const userId = authData.user.id

  // usersテーブルにレコード作成
  const { error: userError } = await supabase.from('users').insert({
    id: userId,
    name,
    email,
    role: 'trainee',
  })

  if (userError) {
    console.error('[inviteRegister] users insert error:', userError)
    return { error: 'ユーザー情報の保存に失敗しました' }
  }

  // trainee_profilesテーブルにレコード作成し、IDを取得
  // （trainer_trainee.trainee_id は trainee_profiles.id を参照するため）
  const { data: traineeProfile, error: profileError } = await supabase
    .from('trainee_profiles')
    .insert({ user_id: userId })
    .select('id')
    .maybeSingle()

  if (profileError || !traineeProfile) {
    console.error('[inviteRegister] trainee_profiles insert error:', profileError)
    return { error: 'プロフィールの作成に失敗しました' }
  }

  // trainer_traineeのtrainee_id（trainee_profiles.id）とstatusを更新
  const { error: updateError } = await supabase
    .from('trainer_trainee')
    .update({ trainee_id: traineeProfile.id, status: 'active' })
    .eq('id', invite.id)

  if (updateError) {
    console.error('[inviteRegister] trainer_trainee update error:', updateError)
    return { error: `招待の紐付けに失敗しました: ${updateError.message}` }
  }

  redirect('/trainee/dashboard')
}
