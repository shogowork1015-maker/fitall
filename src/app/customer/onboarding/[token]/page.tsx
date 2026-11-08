import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SubmitButton } from '@/components/SubmitButton'
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
    <main className="min-h-screen px-4 pb-8 pt-[calc(var(--fitall-safe-top)+28px)]">
      <div className="mx-auto max-w-[430px] space-y-6">
        <header>
          <p className="text-subhead font-semibold text-brand">Limitless App</p>
          <h1 className="mt-1 text-title1 font-bold text-ink">お客様情報の登録</h1>
          <p className="mt-2 text-subhead leading-relaxed text-ink-muted">
            {trainerUser?.name ?? 'トレーナー'}さんの予約・チケット管理アプリを使う準備をします。
          </p>
        </header>

        {error && (
          <div role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-base font-semibold text-danger">
            {error}
          </div>
        )}

        <form action={completeCustomerOnboardingAction.bind(null, token)} className="fitall-card space-y-4 p-5">
          <div>
            <h2 className="text-title3 font-bold text-ink">基本情報</h2>
            <p className="mt-1 text-subhead leading-relaxed text-ink-muted">
              入力後、LINE通知連携に進みます。
            </p>
          </div>

          <label className="block">
            <span className="text-subhead font-medium text-ink-muted">お名前</span>
            <input
              name="name"
              required
              defaultValue={customerUser?.name ?? ''}
              placeholder="山田 太郎"
              className="fitall-input mt-1"
            />
          </label>

          <label className="block">
            <span className="text-subhead font-medium text-ink-muted">メールアドレス</span>
            <input
              name="email"
              type="email"
              required
              defaultValue={customerUser?.email ?? ''}
              placeholder="name@example.com"
              className="fitall-input mt-1"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-subhead font-medium text-ink-muted">身長 cm</span>
              <input
                name="height"
                type="number"
                inputMode="decimal"
                defaultValue={profile?.height ?? ''}
                placeholder="170"
                className="fitall-input mt-1"
              />
            </label>
            <label className="block">
              <span className="text-subhead font-medium text-ink-muted">体重 kg</span>
              <input
                name="weight"
                type="number"
                inputMode="decimal"
                defaultValue={profile?.weight ?? ''}
                placeholder="65"
                className="fitall-input mt-1"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-subhead font-medium text-ink-muted">目的・相談したいこと</span>
            <textarea
              name="goal"
              rows={4}
              defaultValue={profile?.goal ?? ''}
              placeholder="ダイエット、姿勢改善、筋力アップなど"
              className="fitall-input fitall-textarea mt-1"
            />
          </label>

          <SubmitButton className="fitall-primary-action w-full">
            登録してLINE通知へ進む
          </SubmitButton>
        </form>

        <Link href="/customer/app" className="flex min-h-11 items-center justify-center text-base font-semibold text-brand">
          登録済みの方はマイページへ
        </Link>
      </div>
    </main>
  )
}
