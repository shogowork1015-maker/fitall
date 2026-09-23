import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookingLinkManager } from './BookingLinkManager'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'

function InviteShell({
  trainerProfileId,
  preview = false,
}: {
  trainerProfileId: string | null
  preview?: boolean
}) {
  return (
    <>
    <div className="fitall-mobile-ui fitall-page fitall-scroll">
      <div className="fitall-topbar">
        <div className="w-10" />
        <h1 className="flex-1 text-center text-[17px] font-black text-[#0A0A0A]">LINE招待</h1>
        <Link href="/trainer/bookings" className="w-10 text-right text-xs font-black text-[#087D78]">
          予約
        </Link>
      </div>

      <div className="fitall-page-pad space-y-5">
        {preview && (
          <div className="fitall-card bg-[#E8FBFA] px-4 py-3 text-xs font-black leading-relaxed text-[#087D78]">
            開発用UI確認モードです。サンプルのLINE招待を表示しています。
          </div>
        )}

        <section className="fitall-card-strong fitall-card-pop overflow-hidden">
          <div className="bg-[#12C7BE] px-4 py-4 text-white">
            <p className="text-[10px] font-black tracking-[0.12em] text-white/80">LINE FLOW</p>
            <h2 className="mt-1 break-words text-lg font-black leading-snug">LINEからお客様アプリへ招待</h2>
          </div>
          <div className="p-4">
            <div className="fitall-step">
              <span className="fitall-step-num">1</span>
              <div>
                <p className="text-sm font-black text-[#0A0A0A]">LINEで招待を送る</p>
                <p className="mt-0.5 text-xs font-bold text-[#555555]">お客様はLINEからアプリを開けます</p>
              </div>
            </div>
            <div className="fitall-step">
              <span className="fitall-step-num">2</span>
              <div>
                <p className="text-sm font-black text-[#0A0A0A]">お客様がメニューを購入</p>
                <p className="mt-0.5 text-xs font-bold text-[#555555]">月謝は毎月チケットを自動付与します</p>
              </div>
            </div>
            <div className="fitall-step">
              <span className="fitall-step-num">3</span>
              <div>
                <p className="text-sm font-black text-[#0A0A0A]">予約と通知を自動化</p>
                <p className="mt-0.5 text-xs font-bold text-[#555555]">予約、売上、LINE通知に反映します</p>
              </div>
            </div>
          </div>
        </section>

        {trainerProfileId ? (
          <BookingLinkManager trainerProfileId={trainerProfileId} />
        ) : (
          <div className="fitall-card p-6 text-center">
            <p className="text-sm font-black text-[#0A0A0A]">トレーナープロフィールが見つかりません</p>
            <p className="mt-1 text-xs font-bold text-[#555555]">プロフィール作成後にLINE招待を発行できます</p>
          </div>
        )}

        <section className="fitall-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="fitall-section-title">送る前の確認</h2>
            <span className="fitall-pill fitall-pill-aqua">2分で完了</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/trainer/availability" className="fitall-secondary-action fitall-tap">
              空き枠
            </Link>
            <Link href="/trainer/settings" className="fitall-secondary-action fitall-tap">
              料金メニュー
            </Link>
          </div>
        </section>
      </div>
    </div>
    <div className="fitall-desktop-ui fitall-desktop-page">
      <div className="fitall-desktop-container">
        <header className="fitall-desktop-header">
          <div>
            <p className="fitall-kicker">LINE INVITE</p>
            <h1 className="fitall-desktop-title">LINE招待</h1>
            <p className="mt-2 text-sm font-bold text-[#555555]">
              PCでは送信文、アプリ入口、事前チェックを横並びで確認できます。
            </p>
          </div>
          <Link href="/trainer/bookings" className="fitall-secondary-action fitall-tap min-w-[150px]">
            予約管理へ
          </Link>
        </header>

        {preview && (
          <div className="fitall-desktop-card mb-5 bg-[#E8FBFA] px-5 py-3 text-sm font-black text-[#087D78]">
            開発用UI確認モードです。サンプルのLINE招待を表示しています。
          </div>
        )}

        <div className="grid grid-cols-[1fr_1.1fr] gap-5">
          <section className="fitall-desktop-card border-[#0A0A0A]">
            <div className="bg-[#12C7BE] px-5 py-5 text-white">
              <p className="text-[10px] font-black tracking-[0.12em] text-white/80">FLOW</p>
              <h2 className="mt-2 text-2xl font-black">LINEからアプリに入り、購入と予約まで進む</h2>
            </div>
            <div className="p-5">
              <div className="fitall-step">
                <span className="fitall-step-num">1</span>
                <div>
                  <p className="text-sm font-black text-[#0A0A0A]">LINEで招待を送る</p>
                  <p className="mt-0.5 text-xs font-bold text-[#555555]">公式LINE運用にそのまま使えます</p>
                </div>
              </div>
              <div className="fitall-step">
                <span className="fitall-step-num">2</span>
                <div>
                  <p className="text-sm font-black text-[#0A0A0A]">お客様がメニューを購入</p>
                  <p className="mt-0.5 text-xs font-bold text-[#555555]">月謝は期限付きチケットとして管理します</p>
                </div>
              </div>
              <div className="fitall-step">
                <span className="fitall-step-num">3</span>
                <div>
                  <p className="text-sm font-black text-[#0A0A0A]">予約と通知を自動化</p>
                  <p className="mt-0.5 text-xs font-bold text-[#555555]">予約、売上、LINE通知へ反映</p>
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-5">
            {trainerProfileId ? (
              <BookingLinkManager trainerProfileId={trainerProfileId} />
            ) : (
              <div className="fitall-desktop-card p-6 text-center">
                <p className="text-sm font-black text-[#0A0A0A]">トレーナープロフィールが見つかりません</p>
                <p className="mt-1 text-xs font-bold text-[#555555]">プロフィール作成後にLINE招待を発行できます</p>
              </div>
            )}
            <section className="fitall-desktop-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="fitall-section-title">送る前の確認</h2>
                <span className="fitall-pill fitall-pill-aqua">2分で完了</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/trainer/availability" className="fitall-secondary-action fitall-tap">
                  空き枠
                </Link>
                <Link href="/trainer/settings" className="fitall-secondary-action fitall-tap">
                  料金メニュー
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
    </>
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
