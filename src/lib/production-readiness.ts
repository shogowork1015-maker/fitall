import { isDevAuthBypassEnabled } from './dev-preview'

export type ReadinessLevel = 'ok' | 'warn' | 'missing'

export interface ReadinessItem {
  label: string
  level: ReadinessLevel
  detail: string
}

function hasEnv(name: string) {
  return !!process.env[name]?.trim()
}

function envLevel(requiredNames: string[], optional = false): ReadinessLevel {
  const complete = requiredNames.every(hasEnv)
  if (complete) return 'ok'
  return optional ? 'warn' : 'missing'
}

export function getProductionReadinessItems(): ReadinessItem[] {
  const stripeSecret = process.env.STRIPE_SECRET_KEY ?? ''
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ''
  const stripeSecretReady = stripeSecret.startsWith('sk_test_') || stripeSecret.startsWith('sk_live_')
  const stripeWebhookReady = stripeWebhookSecret.startsWith('whsec_')
  const lineReady = envLevel([
    'LINE_LOGIN_CHANNEL_ID',
    'LINE_LOGIN_CHANNEL_SECRET',
    'LINE_CHANNEL_ACCESS_TOKEN',
  ])
  const emailReady = envLevel(['RESEND_API_KEY', 'RESEND_FROM_EMAIL'], true)

  return [
    {
      label: 'アプリURL',
      level: envLevel(['NEXT_PUBLIC_APP_URL']),
      detail: hasEnv('NEXT_PUBLIC_APP_URL')
        ? 'Stripe/LINEの戻り先URLに使えます'
        : 'NEXT_PUBLIC_APP_URL が必要です',
    },
    {
      label: 'Supabase',
      level: envLevel([
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
      ]),
      detail: hasEnv('SUPABASE_SERVICE_ROLE_KEY')
        ? 'Webhook/Cron用のDB操作ができます'
        : 'SUPABASE_SERVICE_ROLE_KEY が必要です',
    },
    {
      label: 'Stripe',
      level: stripeSecretReady && stripeWebhookReady ? 'ok' : stripeSecretReady ? 'warn' : 'missing',
      detail: !stripeSecretReady
        ? 'STRIPE_SECRET_KEY が必要です'
        : !stripeWebhookReady
          ? '決済画面は使えますが、Webhook用の STRIPE_WEBHOOK_SECRET=whsec_... が未設定です'
          : stripeSecret.startsWith('sk_test_')
            ? 'テスト決済とWebhook確認ができます'
            : '本番決済とWebhook確認ができます',
    },
    {
      label: 'LINE通知',
      level: lineReady,
      detail:
        lineReady === 'ok'
          ? 'LINE LoginとMessaging APIの準備ができています'
          : 'LINE_LOGIN_CHANNEL_ID / SECRET / LINE_CHANNEL_ACCESS_TOKEN が必要です',
    },
    {
      label: '顧客マイページ',
      level: envLevel(['CUSTOMER_APP_SESSION_SECRET'], true),
      detail: hasEnv('CUSTOMER_APP_SESSION_SECRET')
        ? '顧客マイページ用Cookieを専用secretで署名できます'
        : '任意ですが CUSTOMER_APP_SESSION_SECRET を設定すると安全です',
    },
    {
      label: 'メールfallback',
      level: emailReady,
      detail:
        emailReady === 'ok'
          ? 'LINE未連携時のメール通知が使えます'
          : '任意ですが RESEND_API_KEY / RESEND_FROM_EMAIL があると安全です',
    },
    {
      label: '前日リマインド',
      level: envLevel(['CRON_SECRET'], true),
      detail: hasEnv('CRON_SECRET')
        ? 'Cron APIの認証が有効です'
        : 'CRON_SECRET を設定するとCron APIを保護できます',
    },
    {
      label: 'ログイン確認',
      level: process.env.NODE_ENV === 'production' || !isDevAuthBypassEnabled() ? 'ok' : 'warn',
      detail:
        process.env.NODE_ENV === 'production'
          ? '本番ではログイン回避は無効です'
          : '開発環境ではUI確認用ログイン回避が有効です',
    },
  ]
}
