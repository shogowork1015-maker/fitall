import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { readTrainerSettingsFromBio } from '@/lib/trainer-settings'
import { TrainerSettingsForm } from './TrainerSettingsForm'

export default async function TrainerSettingsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('trainer_profiles')
    .select('id, bio')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) {
    return (
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0A0A0A]">運営設定</h1>
        <div className="mt-4 bg-white rounded-[20px] p-6 text-center text-sm text-[#9CA3AF] border border-[#E5E7EB]">
          トレーナープロフィールが見つかりません
        </div>
      </div>
    )
  }

  const { data: plans } = await supabase
    .from('plans')
    .select('id, name, price')
    .eq('trainer_id', profile.id)
    .order('created_at')

  const settings = readTrainerSettingsFromBio(profile.bio)

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0A0A0A]">運営設定</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          営業時間・1セッション時間・メニューをここで管理します
        </p>
      </div>

      <TrainerSettingsForm
        initialSettings={settings}
        initialMenus={(plans ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
        }))}
      />
    </div>
  )
}
