import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { BookingLinkManager } from './BookingLinkManager'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'
import { Screen, Note } from '@/ui/Screen'
import ui from '@/ui/ui.module.css'
import { Section, Row } from '@/ui/List'

// 招待タブ。
// 来る理由：お客様にアプリを案内する。主役：届くメッセージ。主な操作：LINEで招待を送る
function InviteShell({
  trainerProfileId,
  preview = false,
}: {
  trainerProfileId: string | null
  preview?: boolean
}) {
  return (
    <Screen caption="LINEでお客様をご案内" title="招待">
      {trainerProfileId ? (
        <BookingLinkManager trainerProfileId={trainerProfileId} />
      ) : (
        <Section group footer="プロフィールを作成すると、招待を送れます。">
          <Row title="トレーナープロフィールが見つかりません" />
        </Section>
      )}

      <Section title="このあとの流れ">
        <ol className={ui.steps}>
          {[
            ['お客様がLINEから開く', '登録はいりません'],
            ['チケットを買う', 'カード決済（Stripe）'],
            ['空いている日時を予約する', 'あなたに通知が届きます'],
          ].map(([title, note], index) => (
            <li key={title} className={ui.step}><b>{index + 1}</b><p>{title}<small>{note}</small></p></li>
          ))}
        </ol>
      </Section>

      <Section header="送る前に確認" group>
        <Row href="/trainer/availability" title="空き時間" />
        <Row href="/trainer/settings" title="料金メニュー" />
      </Section>

      {preview ? <Note>確認モード（サンプルの招待）</Note> : null}
    </Screen>
  )
}

export default async function TrainerInvitePage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const devAuthBypass = isDevAuthBypassEnabled()

  if (!user && !devAuthBypass) redirect('/auth/login')

  if (!user && devAuthBypass) {
    return <InviteShell trainerProfileId="preview-trainer" preview />
  }

  const { data: profile } = await supabase
    .from('trainer_profiles')
    .select('id')
    .eq('user_id', user!.id)
    .maybeSingle()

  return <InviteShell trainerProfileId={profile?.id ?? null} />
}
