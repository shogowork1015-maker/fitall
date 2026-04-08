'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export type RegisterState = { error: string } | null

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const priceStr = formData.get('price_per_session') as string
  const price = parseInt(priceStr, 10)

  if (!name || !email || !password || !price) {
    return { error: 'すべての項目を入力してください' }
  }

  if (password.length < 8) {
    return { error: 'パスワードは8文字以上で設定してください' }
  }

  const supabase = await createServerSupabaseClient()

  // Supabase Authでアカウント作成（user_metadata に role を載せると、RLS で users が読めない場合でもログインで判定できる）
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: 'trainer',
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

  // public.users に同じ id のレコードが既にあるか確認
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
      role: 'trainer',
    })

    if (userError) {
      // email 重複（code: 23505）= このメールは既に public.users に存在する
      if (userError.code === '23505') {
        return { error: 'このメールアドレスはすでに登録されています。ログインしてください。' }
      }
      console.error('[registerAction] users insert error:', userError)
      return { error: `ユーザー情報の保存に失敗しました: ${userError.message}` }
    }
  }

  // trainer_profiles が未作成なら作成
  const { data: existingProfile } = await supabase
    .from('trainer_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!existingProfile) {
    await supabase.from('trainer_profiles').insert({
      user_id: userId,
      price_per_session: price,
    })
  }

  redirect('/trainer/dashboard')
}
