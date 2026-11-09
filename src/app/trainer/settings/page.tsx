import { redirect } from 'next/navigation'
import { signOutAction } from '@/app/auth/login/actions'
import { getProductionReadinessItems } from '@/lib/production-readiness'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  getPlanSettings,
  readTrainerPlanSettingsFromBio,
  readTrainerSettingsFromBio,
} from '@/lib/trainer-settings'
import { TrainerSettingsForm } from './TrainerSettingsForm'
import { Screen } from '@/ui/Screen'
import ui from '@/ui/ui.module.css'
import { Section, Row } from '@/ui/List'
import { Button } from '@/ui/Button'

// 確認モードで見せる料金メニュー
const PREVIEW_PLANS = [
  { id: 'preview-plan-4', name: '4回チケット', price: 32000, sessions: 4 },
  { id: 'preview-plan-8', name: '8回チケット', price: 60000, sessions: 8 },
  { id: 'preview-plan-monthly', name: '月謝 4回', price: 30000, sessions: 4 },
]

export default async function TrainerSettingsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const devAuthBypass = isDevAuthBypassEnabled()

  if (!user && !devAuthBypass) redirect('/auth/login')

  // 確認モード（ログインなし）では本物のDBを読まず、サンプルを出す。保存もしない
  const preview = !user
  const { data: profile } = user
    ? await supabase
        .from('trainer_profiles')
        .select('id, bio')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: { id: 'preview-trainer', bio: null } }

  if (!profile) {
    return (
      <Screen title="設定" back={{ href: '/trainer/dashboard', label: 'ホーム' }}>
        <Section group footer="プロフィールを作成すると、受付時間と料金メニューを設定できます。">
          <Row title="トレーナープロフィールが見つかりません" />
        </Section>
      </Screen>
    )
  }

  const { data: plans } = preview
    ? { data: PREVIEW_PLANS }
    : await supabase
        .from('plans')
        .select('id, name, price, sessions')
        .eq('trainer_id', profile.id)
        .order('created_at')

  const settings = readTrainerSettingsFromBio(profile.bio)
  const planSettings = readTrainerPlanSettingsFromBio(profile.bio)
  const readinessItems = getProductionReadinessItems()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000'
  const stripeItem = readinessItems.find((item) => item.label.includes('Stripe'))
  const lineItems = [
    { label: 'LINE Login Channel ID', env: 'LINE_LOGIN_CHANNEL_ID' },
    { label: 'LINE Login Channel Secret', env: 'LINE_LOGIN_CHANNEL_SECRET' },
    { label: 'Messaging API Access Token', env: 'LINE_CHANNEL_ACCESS_TOKEN' },
  ]
  const lineReady = lineItems.every((item) => Boolean(process.env[item.env]?.trim()))

  return (
    <Screen title="設定" back={{ href: '/trainer/dashboard', label: 'ホーム' }}>
      <TrainerSettingsForm
        initialSettings={settings}
        initialMenus={(plans ?? []).map((p, index) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          sessions: p.sessions ?? 1,
          ...getPlanSettings(planSettings, p.id, {
            billing_type: preview && p.name.startsWith('月謝') ? 'monthly' : 'ticket',
            sort_order: index,
          }),
        }))}
        preview={preview}
      />

      <Section group header="連携">
        <Row title="LINE通知" trailing={<span className={ui.switch} data-on={lineReady} role="img" aria-label={lineReady ? 'オン' : 'オフ'} />} />
        <Row title="カード決済（Stripe）" value={stripeItem?.level === 'ok' ? '接続済み' : '未設定'} />
      </Section>

      <Section group header="管理者向けの確認" footer={`LINEのコールバックURL：${appUrl}/api/line/connect/callback ほか2件`}>
        {readinessItems.map((item) => (
          <Row key={item.label} title={item.label} subtitle={item.detail} value={item.level === 'ok' ? 'OK' : item.level === 'warn' ? '確認' : '不足'} />
        ))}
        <Row href="https://developers.line.biz/console/" external title="LINE Developersを開く" />
      </Section>

      <Section>
        <form action={signOutAction} style={{ margin: '0 16px' }}>
          <Button type="submit" variant="destructive">ログアウト</Button>
        </form>
      </Section>
    </Screen>
  )
}
