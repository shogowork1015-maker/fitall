'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export type RegisterTraineeState = { error: string } | null

export async function registerTraineeAction(
  _prevState: RegisterTraineeState,
  formData: FormData
): Promise<RegisterTraineeState> {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!name || !email || !password) {
    return { error: 'すべての項目を入力してください' }
  }

  if (password.length < 8) {
    return { error: 'パスワードは8文字以上で設定してください' }
  }

  const supabase = await createServerSupabaseClient()

  // Supabase Auth でアカウント作成
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
    if (authError?.message.includes('already registered')) {
      return { error: 'このメールアドレスはすでに登録されています' }
    }
    return { error: authError?.message ?? '登録に失敗しました' }
  }

  const userId = authData.user.id

  // public.users にレコード作成
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (!existingUser) {
    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      name,
      email,
      role: 'trainee',
    })

    if (userError) {
      if (userError.code === '23505') {
        return { error: 'このメールアドレスはすでに登録されています。ログインしてください。' }
      }
      console.error('[registerTraineeAction] users insert error:', userError)
      return { error: `ユーザー情報の保存に失敗しました: ${userError.message}` }
    }
  }

  // trainee_profiles にレコード作成
  const { data: existingProfile } = await supabase
    .from('trainee_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!existingProfile) {
    await supabase.from('trainee_profiles').insert({ user_id: userId })
  }

  redirect('/trainee/dashboard')
}
