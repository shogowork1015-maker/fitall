import { redirect } from 'next/navigation'
import { getProductionReadinessItems } from '@/lib/production-readiness'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  getPlanSettings,
  readTrainerPlanSettingsFromBio,
  readTrainerSettingsFromBio,
} from '@/lib/trainer-settings'
import { TrainerSettingsForm } from './TrainerSettingsForm'

export default async function TrainerSettingsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const devAuthBypass = isDevAuthBypassEnabled()

  if (!user && !devAuthBypass) redirect('/auth/login')

  const readSupabase = user ? supabase : createAdminSupabaseClient()
  const { data: profile } = user
    ? await readSupabase
        .from('trainer_profiles')
        .select('id, bio')
        .eq('user_id', user.id)
        .maybeSingle()
    : await readSupabase
        .from('trainer_profiles')
        .select('id, bio')
        .order('created_at')
        .limit(1)
        .maybeSingle()

  if (!profile) {
    return (
      <div className="fitall-page fitall-scroll px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black text-[#0A0A0A]">設定</h1>
        <div className="fitall-card mt-4 p-6 text-center text-sm font-bold text-[#555555]">
          トレーナープロフィールが見つかりません
        </div>
      </div>
    )
  }

  const { data: plans } = await readSupabase
    .from('plans')
    .select('id, name, price, sessions')
    .eq('trainer_id', profile.id)
    .order('created_at')

  const settings = readTrainerSettingsFromBio(profile.bio)
  const planSettings = readTrainerPlanSettingsFromBio(profile.bio)
  const readinessItems = getProductionReadinessItems()
  const missingCount = readinessItems.filter((item) => item.level === 'missing').length
  const warnCount = readinessItems.filter((item) => item.level === 'warn').length
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000'
  const lineItems = [
    { label: 'LINE Login Channel ID', env: 'LINE_LOGIN_CHANNEL_ID' },
    { label: 'LINE Login Channel Secret', env: 'LINE_LOGIN_CHANNEL_SECRET' },
    { label: 'Messaging API Access Token', env: 'LINE_CHANNEL_ACCESS_TOKEN' },
  ]

  return (
    <div className="fitall-page fitall-scroll">
      <div className="fitall-topbar">
        <h1 className="text-[17px] font-black text-[#0A0A0A] flex-1 text-center">設定</h1>
      </div>
      <div className="px-4 py-6 space-y-4">
        <section className="fitall-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="fitall-section-title">本番準備チェック</p>
              <p className="mt-1 text-xs font-bold text-[#555555]">
                Stripe、LINE、通知、DB設定の抜け漏れを確認します
              </p>
            </div>
            <span
              className={`rounded-[6px] px-2.5 py-1 text-xs font-black ${
                missingCount
                  ? 'bg-[#FEF2F2] text-[#D4183D]'
                  : warnCount
                    ? 'bg-[#FEF3C7] text-[#92400E]'
                    : 'bg-[#E8FBFA] text-[#087D78]'
              }`}
            >
              {missingCount ? `${missingCount}件不足` : warnCount ? `${warnCount}件確認` : '準備OK'}
            </span>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {readinessItems.map((item) => (
              <div
                key={item.label}
                className="rounded-[8px] border-2 border-[#DDE8E8] bg-white px-3 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-[#0A0A0A]">{item.label}</p>
                  <span
                    className={`rounded-[5px] px-2 py-0.5 text-[10px] font-black ${
                      item.level === 'ok'
                        ? 'bg-[#E8FBFA] text-[#087D78]'
                        : item.level === 'warn'
                          ? 'bg-[#FEF3C7] text-[#92400E]'
                          : 'bg-[#FEF2F2] text-[#D4183D]'
                    }`}
                  >
                    {item.level === 'ok' ? 'OK' : item.level === 'warn' ? '確認' : '不足'}
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold leading-relaxed text-[#555555]">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="fitall-card-strong overflow-hidden">
          <div className="bg-[#12C7BE] px-4 py-4 text-white">
            <p className="text-[10px] font-black tracking-[0.12em] text-white/80">LINE SETUP</p>
            <h2 className="mt-1 text-lg font-black">LINE連携</h2>
          </div>
          <div className="space-y-4 p-4">
            <p className="text-sm font-bold leading-relaxed text-[#555555]">
              お客様はLINEログインでアプリに入り、予約確認・チケット残数・通知を受け取る設計にします。
            </p>
            <div className="grid gap-2 md:grid-cols-3">
              {lineItems.map((item) => {
                const ready = !!process.env[item.env]?.trim()
                return (
                  <div key={item.env} className="border-2 border-[#DDE8E8] bg-white px-3 py-3">
                    <p className="text-[10px] font-black text-[#087D78]">{item.label}</p>
                    <p className="mt-1 text-sm font-black text-[#0A0A0A]">
                      {ready ? '設定済み' : '未設定'}
                    </p>
                    <p className="mt-1 font-mono text-[10px] font-bold text-[#555555]">{item.env}</p>
                  </div>
                )
              })}
            </div>
            <div className="border-2 border-[#DDE8E8] bg-[#F4F7F7] px-3 py-3">
              <p className="text-[10px] font-black text-[#087D78]">LINE Login Callback URLs</p>
              <div className="mt-2 space-y-2">
                <p className="break-all font-mono text-xs font-black text-[#0A0A0A]">
                  {appUrl}/api/line/connect/callback
                </p>
                <p className="break-all font-mono text-xs font-black text-[#0A0A0A]">
                  {appUrl}/api/line/customer-connect/callback
                </p>
                <p className="break-all font-mono text-xs font-black text-[#0A0A0A]">
                  {appUrl}/api/line/app/callback
                </p>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <a
                href="https://developers.line.biz/console/"
                target="_blank"
                rel="noreferrer"
                className="fitall-aqua-action fitall-tap"
              >
                LINE Developersを開く
              </a>
              <a
                href="/customer/app"
                className="fitall-secondary-action fitall-tap"
              >
                お客様アプリを確認
              </a>
            </div>
          </div>
        </section>
        <TrainerSettingsForm
          initialSettings={settings}
          initialMenus={(plans ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            sessions: p.sessions ?? 1,
            ...getPlanSettings(planSettings, p.id),
          }))}
        />
      </div>
    </div>
  )
}
