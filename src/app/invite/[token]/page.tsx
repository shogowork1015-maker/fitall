import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { InviteForm } from './InviteForm'

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createServerSupabaseClient()

  // 招待トークンの検証とトレーナー情報の取得
  const { data: invite } = await supabase
    .from('trainer_trainee')
    .select('id, status, trainer_id')
    .eq('invite_token', token)
    .maybeSingle()

  if (!invite) {
    notFound()
  }

  // trainer_trainee.trainer_id は trainer_profiles.id を参照するため、users へは経由して取得
  const { data: trainerProfile } = await supabase
    .from('trainer_profiles')
    .select('user_id')
    .eq('id', invite.trainer_id)
    .maybeSingle()

  const { data: trainer } = trainerProfile
    ? await supabase.from('users').select('name').eq('id', trainerProfile.user_id).maybeSingle()
    : { data: null }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tight text-gray-900">
            FITALL
          </h1>
          <div className="mt-4 bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">招待したトレーナー</p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {trainer?.name ?? '不明'} さん
            </p>
          </div>
        </div>

        {invite.status === 'active' ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700 text-center">
            この招待リンクはすでに使用済みです
          </div>
        ) : (
          <InviteForm token={token} />
        )}
      </div>
    </div>
  )
}
