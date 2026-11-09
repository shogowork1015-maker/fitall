import { redirect } from 'next/navigation'
import { SubmitButton } from '@/ui/SubmitButton'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClientInviteAction } from './actions'
import { Screen } from '@/ui/Screen'
import { Section, Row, Banner } from '@/ui/List'
import { Button } from '@/ui/Button'
import s from '@/ui/ui.module.css'

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
    <Screen title="お客様を追加" back={{ href: '/trainer/clients', label: 'お客様' }}>
      {createdUrl ? (
        <>
          <Section group header="登録リンクができました" footer="お客様がこのリンクから情報を確認すると、マイページが使えるようになります。">
            <Row title={<span style={{ wordBreak: 'break-all' }}>{createdUrl}</span>} />
          </Section>
          <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            <Button href={`https://social-plugins.line.me/lineit/share?text=${encodeURIComponent(message)}`}>LINEで送る</Button>
            <Button variant="secondary" href="/trainer/clients">お客様の一覧へ</Button>
          </div>
        </>
      ) : null}

      {error ? <div style={{ marginTop: 16 }}><Banner tone="error">{error}</Banner></div> : null}

      <form action={createClientInviteAction}>
        <Section group header="お客様" footer="あとでお客様本人が登録リンクから確認・修正できます。">
          <div className={s.field}>
            <label htmlFor="client-name">お名前</label>
            <input id="client-name" name="name" required placeholder="山田 太郎" autoComplete="off" />
          </div>
          <div className={s.field}>
            <label htmlFor="client-email">メール</label>
            <input id="client-email" name="email" type="email" inputMode="email" required placeholder="name@example.com" autoComplete="off" />
          </div>
        </Section>

        <Section group header="任意">
          <div className={s.field}>
            <label htmlFor="client-height">身長 cm</label>
            <input id="client-height" name="height" type="number" inputMode="decimal" placeholder="170" />
          </div>
          <div className={s.field}>
            <label htmlFor="client-weight">体重 kg</label>
            <input id="client-weight" name="weight" type="number" inputMode="decimal" placeholder="65" />
          </div>
        </Section>

        <Section header="目的・メモ">
          <textarea name="goal" rows={4} placeholder="ダイエット、姿勢改善、筋力アップなど" className={s.textarea} />
        </Section>

        <Section footer="作成したリンクをLINEで送ると、お客様が登録できます。">
          <SubmitButton pendingLabel="作成しています…">登録リンクを作る</SubmitButton>
        </Section>
      </form>
    </Screen>
  )
}
