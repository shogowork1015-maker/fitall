import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { TrainerTabNav } from './TrainerTabNav'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const devAuthBypass = isDevAuthBypassEnabled()

  if (!user && !devAuthBypass) {
    redirect('/auth/login')
  }

  if (!user && devAuthBypass) {
    return (
      <div className="fitall-trainer-shell">
        <main className="fitall-trainer-main">{children}</main>
        <TrainerTabNav />
      </div>
    )
  }

  // お客様用アカウントが管理画面にアクセスした場合のみリダイレクト
  // （role が null/undefined の場合はループ防止のためリダイレクトしない）
  const { data: userData } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', user!.id)
    .single()

  if (userData?.role === 'trainee') {
    redirect('/auth/login?trainerOnly=1')
  }

  return (
    <div className="fitall-trainer-shell">
      <main className="fitall-trainer-main">{children}</main>
      <TrainerTabNav />
    </div>
  )
}
