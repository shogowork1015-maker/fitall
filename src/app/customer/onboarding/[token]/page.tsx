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
    <main className="min-h-screen bg-white px-4 py-5">
      <div className="mx-auto max-w-[430px] space-y-4">
        <section className="fitall-card-strong overflow-hidden">
          <div className="bg-[#12C7BE] px-5 py-5 text-white">
            <p className="text-[10px] font-black tracking-[0.12em] text-white/80">LIMITLESS APP</p>
            <h1 className="mt-2 text-2xl font-black leading-tight">お客様情報の登録</h1>
            <p className="mt-2 text-sm font-bold leading-relaxed text-white/90">
              {trainerUser?.name ?? 'トレーナー'}さんの予約・チケット管理アプリを使う準備をします。
            </p>
          </div>
        </section>

        {error && (
          <div className="border-2 border-[#D4183D] bg-[#FEF2F2] px-3 py-3 text-sm font-black text-[#D4183D]">
            {error}
          </div>
        )}

        <form action={completeCustomerOnboardingAction.bind(null, token)} className="fitall-card space-y-4 p-4">
          <div>
            <h2 className="fitall-section-title">基本情報</h2>
            <p className="mt-1 text-xs font-bold leading-relaxed text-[#555555]">
              入力後、LINE通知連携に進みます。
            </p>
          </div>

          <label className="block">
            <span className="text-xs font-black text-[#555555]">お名前</span>
            <input
              name="name"
              required
              defaultValue={customerUser?.name ?? ''}
              placeholder="山田 太郎"
              className="fitall-focus-ring mt-1 h-12 w-full rounded-[6px] border-2 border-[#DDE8E8] px-3 text-sm font-bold outline-none focus:border-[#12C7BE]"
            />
          </label>

          <label className="block">
            <span className="text-xs font-black text-[#555555]">メールアドレス</span>
            <input
              name="email"
              type="email"
              required
              defaultValue={customerUser?.email ?? ''}
              placeholder="name@example.com"
              className="fitall-focus-ring mt-1 h-12 w-full rounded-[6px] border-2 border-[#DDE8E8] px-3 text-sm font-bold outline-none focus:border-[#12C7BE]"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-black text-[#555555]">身長 cm</span>
              <input
                name="height"
                type="number"
                inputMode="decimal"
                defaultValue={profile?.height ?? ''}
                placeholder="170"
                className="fitall-focus-ring mt-1 h-12 w-full rounded-[6px] border-2 border-[#DDE8E8] px-3 text-sm font-bold outline-none focus:border-[#12C7BE]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black text-[#555555]">体重 kg</span>
              <input
                name="weight"
                type="number"
                inputMode="decimal"
                defaultValue={profile?.weight ?? ''}
                placeholder="65"
                className="fitall-focus-ring mt-1 h-12 w-full rounded-[6px] border-2 border-[#DDE8E8] px-3 text-sm font-bold outline-none focus:border-[#12C7BE]"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-black text-[#555555]">目的・相談したいこと</span>
            <textarea
              name="goal"
              rows={4}
              defaultValue={profile?.goal ?? ''}
              placeholder="ダイエット、姿勢改善、筋力アップなど"
              className="fitall-focus-ring mt-1 w-full rounded-[6px] border-2 border-[#DDE8E8] px-3 py-3 text-sm font-bold outline-none focus:border-[#12C7BE]"
            />
          </label>

          <SubmitButton className="fitall-primary-action fitall-tap h-12 w-full text-sm">
            登録してLINE通知へ進む
          </SubmitButton>
        </form>

        <Link href="/customer/app" className="block py-3 text-center text-xs font-black text-[#087D78]">
          登録済みの方はマイページへ
        </Link>
      </div>
    </main>
  )
}
