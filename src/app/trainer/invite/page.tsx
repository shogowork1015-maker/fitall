import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { InviteManager } from './InviteManager'

export default async function TrainerInvitePage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // trainer_trainee.trainer_id は trainer_profiles.id を参照するため先に取得
  const { data: profile } = await supabase
    .from('trainer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // 既存の招待リンク一覧（新しい順）
  const { data: links } = profile
    ? await supabase
        .from('trainer_trainee')
        .select('id, invite_token, status, created_at')
        .eq('trainer_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0A0A0A] mb-1">招待リンク</h1>
      <p className="text-sm text-[#6B7280] mb-6">
        リンクを発行してLINEでお客さんに送りましょう
      </p>

      <InviteManager initialLinks={links ?? []} />
    </div>
  )
}
