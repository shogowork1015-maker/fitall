import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { TraineeTabNav } from './TraineeTabNav'

export default async function TraineeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // トレーナーがトレーニー画面にアクセスした場合はリダイレクト
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (userData?.role === 'trainer') {
    redirect('/trainer/dashboard')
  }

  // trainee_profiles を取得、なければ自動作成（古いアカウント対応）
  let { data: traineeProfile } = await supabase
    .from('trainee_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!traineeProfile) {
    const { data: created } = await supabase
      .from('trainee_profiles')
      .insert({ user_id: user.id })
      .select('id')
      .maybeSingle()
    traineeProfile = created
  }

  let hasTrainer = false
  if (traineeProfile) {
    const { data: relation } = await supabase
      .from('trainer_trainee')
      .select('id')
      .eq('trainee_id', traineeProfile.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    hasTrainer = !!relation
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA]">
      <main className="flex-1 pb-20">{children}</main>
      <TraineeTabNav hasTrainer={hasTrainer} />
    </div>
  )
}
