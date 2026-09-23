import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

// ルートページ：認証状態とロールに応じてリダイレクト
export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role === 'trainer') {
    redirect('/trainer/dashboard')
  }

  redirect('/auth/login?trainerOnly=1')
}
