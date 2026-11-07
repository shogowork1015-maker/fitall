import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SubmitButton } from '@/components/SubmitButton'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClientInviteAction } from './actions'

interface PageProps {
  searchParams?: Promise<{
    created?: string
    error?: string
  }>
}

function errorMessage(error?: string) {
  if (error === 'invalid') return '名前と正しいメールアドレスを入力してください。'
  if (error === 'role') return 'このメールアドレスはトレーナーアカウントで使われています。'
  if (error === 'no-trainer') return 'トレーナープロフィールが見つかりません。'
  if (error === 'save') return 'お客様情報の保存に失敗しました。少し時間をおいて再度お試しください。'
  return null
}

export default async function NewClientPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const devAuthBypass = isDevAuthBypassEnabled()

  if (!user && !devAuthBypass) redirect('/auth/login')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000'
  const createdUrl = params?.created ? `${appUrl}/customer/onboarding/${params.created}` : null
  const message = createdUrl
    ? `Limitless Appの登録をお願いします。\nお客様情報を入力すると、予約・チケット確認・LINE通知が使えます。\n${createdUrl}`
    : ''
  const error = errorMessage(params?.error)

  return (
    <div className="fitall-page fitall-scroll">
      <div className="fitall-topbar">
        <Link href="/trainer/clients" className="w-14 font-bold text-brand">
          戻る
        </Link>
        <h1 className="flex-1 text-center text-[17px] font-black text-ink">お客様追加</h1>
        <div className="w-14" />
      </div>

      <div className="fitall-page-pad mx-auto max-w-[720px] space-y-5">
        <section className="fitall-card-strong overflow-hidden">
          <div className="bg-accent px-4 py-5 text-ink">
            <p className="text-base font-bold text-ink/70">お客様の登録</p>
            <h2 className="mt-1 text-2xl font-black">既存のお客様を招待</h2>
            <p className="mt-2 text-base font-bold leading-relaxed text-ink/70">
              トレーナー側で仮登録し、専用リンクからお客様本人に情報を確認・登録してもらいます。
            </p>
          </div>
        </section>

        {createdUrl && (
          <section className="fitall-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="fitall-section-title">登録リンク</h2>
              <span className="fitall-pill fitall-pill-aqua">LINEで送る</span>
            </div>
            <p className="break-all border border-line bg-surface-soft px-3 py-3 font-mono text-base font-bold text-ink">
              {createdUrl}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <a
                href={`https://social-plugins.line.me/lineit/share?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noreferrer"
                className="fitall-aqua-action fitall-tap h-12 text-base"
              >
                LINEで送る
              </a>
              <Link href="/trainer/clients" className="fitall-secondary-action fitall-tap h-12 text-base">
                お客様一覧へ
              </Link>
            </div>
          </section>
        )}

        {error && (
          <div className="border border-danger bg-danger-soft px-3 py-3 text-base font-bold text-danger">
            {error}
          </div>
        )}

        <form action={createClientInviteAction} className="fitall-card space-y-4 p-4">
          <div>
            <h2 className="fitall-section-title">仮登録する情報</h2>
            <p className="mt-1 text-base font-medium leading-relaxed text-ink-muted">
              後でお客様本人が登録リンクから確認・修正できます。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-base font-medium text-ink-muted">お名前</span>
              <input
                name="name"
                required
                placeholder="山田 太郎"
                className="fitall-focus-ring mt-1 h-12 w-full rounded-control border border-line px-3 text-base font-bold outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-base font-medium text-ink-muted">メールアドレス</span>
              <input
                name="email"
                type="email"
                required
                placeholder="name@example.com"
                className="fitall-focus-ring mt-1 h-12 w-full rounded-control border border-line px-3 text-base font-bold outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-base font-medium text-ink-muted">身長 cm</span>
              <input
                name="height"
                type="number"
                inputMode="decimal"
                placeholder="170"
                className="fitall-focus-ring mt-1 h-12 w-full rounded-control border border-line px-3 text-base font-bold outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-base font-medium text-ink-muted">体重 kg</span>
              <input
                name="weight"
                type="number"
                inputMode="decimal"
                placeholder="65"
                className="fitall-focus-ring mt-1 h-12 w-full rounded-control border border-line px-3 text-base font-bold outline-none focus:border-accent"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-base font-medium text-ink-muted">目的・メモ</span>
            <textarea
              name="goal"
              rows={4}
              placeholder="ダイエット、姿勢改善、筋力アップなど"
              className="fitall-focus-ring mt-1 w-full rounded-control border border-line px-3 py-3 text-base font-bold outline-none focus:border-accent"
            />
          </label>

          <SubmitButton className="fitall-primary-action fitall-tap h-12 w-full text-base">
            登録リンクを作成
          </SubmitButton>
        </form>

        <section className="fitall-card p-4">
          <h2 className="fitall-section-title">この後の流れ</h2>
          <div className="mt-3 space-y-3">
            {['LINEで登録リンクを送る', 'お客様が情報を確認・入力する', 'LINE通知を連携してマイページ利用開始'].map((item, index) => (
              <div key={item} className="fitall-step">
                <span className="fitall-step-num">{index + 1}</span>
                <p className="text-base font-bold text-ink">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
