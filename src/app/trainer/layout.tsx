import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { TrainerTabNav } from './TrainerTabNav'

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // トレーニーがトレーナー画面にアクセスした場合のみリダイレクト
  // （role が null/undefined の場合はループ防止のためリダイレクトしない）
  const { data: userData } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (userData?.role === 'trainee') {
    redirect('/trainee/dashboard')
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA]">
      <main className="flex-1 pb-20">{children}</main>
      <TrainerTabNav />
    </div>
  )
}
