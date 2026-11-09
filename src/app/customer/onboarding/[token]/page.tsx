import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SubmitButton } from '@/ui/SubmitButton'
import { Section, Banner } from '@/ui/List'
import s from '@/ui/ui.module.css'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { completeCustomerOnboardingAction } from './actions'

interface PageProps {
  params: Promise<{ token: string }>
  searchParams?: Promise<{
    error?: string
  }>
}

function errorMessage(error?: string) {
  if (error === 'invalid') return '名前と正しいメールアドレスを入力してください。'
  if (error === 'role') return 'このメールアドレスは別の権限で使われています。'
  if (error === 'save') return '登録に失敗しました。もう一度お試しください。'
  return null
}

export default async function CustomerOnboardingPage({ params, searchParams }: PageProps) {
  const { token } = await params
  const query = await searchParams
  const supabase = createAdminSupabaseClient()

  const { data: relation } = await supabase
    .from('trainer_trainee')
    .select('id, trainer_id, trainee_id')
    .eq('invite_token', token)
    .maybeSingle()

  if (!relation) notFound()

  const { data: trainerProfile } = await supabase
    .from('trainer_profiles')
    .select('id, user_id')
    .eq('id', relation.trainer_id)
    .maybeSingle()
  const { data: trainerUser } = trainerProfile
    ? await supabase.from('users').select('name').eq('id', trainerProfile.user_id).maybeSingle()
    : { data: null }

  const { data: profile } = relation.trainee_id
    ? await supabase
        .from('trainee_profiles')
        .select('id, user_id, height, weight, goal')
        .eq('id', relation.trainee_id)
        .maybeSingle()
    : { data: null }
  const { data: customerUser } = profile?.user_id
    ? await supabase.from('users').select('name, email').eq('id', profile.user_id).maybeSingle()
    : { data: null }
  const error = errorMessage(query?.error)

  return (
    <div className={s.screen}>
      <main className={s.entry} style={{ paddingTop: 'calc(var(--ui-safe-top) + 40px)' }}>
        <span className={s.wordmark}>Limitless</span>
        <h1 className={s.entryTitle}>お客様情報の登録</h1>
        <p className={s.entryLead}>{trainerUser?.name ?? 'トレーナー'}さんの予約・チケットを使う準備をします。</p>

        {error ? <div style={{ marginTop: 20 }}><Banner tone="error">{error}</Banner></div> : null}

        <form action={completeCustomerOnboardingAction.bind(null, token)}>
          <Section group header="お客様">
            <div className={s.field}>
              <label htmlFor="onboarding-name">お名前</label>
              <input id="onboarding-name" name="name" required autoComplete="name" defaultValue={customerUser?.name ?? ''} placeholder="山田 花子" />
            </div>
            <div className={s.field}>
              <label htmlFor="onboarding-email">メール</label>
              <input id="onboarding-email" name="email" type="email" inputMode="email" autoComplete="email" required defaultValue={customerUser?.email ?? ''} placeholder="name@example.com" />
            </div>
          </Section>

          <Section group header="任意">
            <div className={s.field}>
              <label htmlFor="onboarding-height">身長 cm</label>
              <input id="onboarding-height" name="height" type="number" inputMode="decimal" defaultValue={profile?.height ?? ''} placeholder="160" />
            </div>
            <div className={s.field}>
              <label htmlFor="onboarding-weight">体重 kg</label>
              <input id="onboarding-weight" name="weight" type="number" inputMode="decimal" defaultValue={profile?.weight ?? ''} placeholder="55" />
            </div>
          </Section>

          <Section header="目的・相談したいこと">
            <textarea name="goal" rows={4} className={s.textarea} defaultValue={profile?.goal ?? ''} placeholder="ダイエット、姿勢改善、筋力アップなど" />
          </Section>

          <Section footer="登録すると、LINE通知の連携に進みます。">
            <SubmitButton pendingLabel="登録しています…">登録してLINE通知へ進む</SubmitButton>
          </Section>
        </form>

        <p className={s.entryLinks}>登録済みの方は<Link href="/customer/app">マイページへ</Link></p>
      </main>
    </div>
  )
}
