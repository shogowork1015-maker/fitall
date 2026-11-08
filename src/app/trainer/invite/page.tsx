import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookingLinkManager } from './BookingLinkManager'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'
import { DevPreviewNote, PageHeader } from '@/components/ui/PageHeader'
import { ChevronRightIcon, ClockIcon, TicketIcon } from '@/components/ui/Icons'

// お客様が招待を受け取ってから予約するまでの流れ
function InviteFlow() {
  const steps = [
    { title: 'LINEで招待を送る', body: 'お客様はLINEからアプリを開けます' },
    { title: 'お客様がメニューを購入', body: '月謝は毎月チケットを自動で付与します' },
    { title: '予約と通知を自動化', body: '予約・売上・LINE通知に反映します' },
  ]
  return (
    <section>
      <h2 className="fitall-group-label">ご案内の流れ</h2>
      <ol className="fitall-group">
        {steps.map((step, index) => (
          <li key={step.title} className="fitall-row" data-inset="avatar">
            <span className="fitall-step-num">{index + 1}</span>
            <div className="fitall-row-main">
              <p className="fitall-row-title">{step.title}</p>
              <p className="fitall-row-meta">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

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
      <PageHeader title="招待" subtitle="LINEでお客様アプリにご案内します" />

      <div className="fitall-page-pad space-y-7">
        {preview && <DevPreviewNote>開発用の確認モード（サンプルの招待）</DevPreviewNote>}

        {trainerProfileId ? (
          <BookingLinkManager trainerProfileId={trainerProfileId} />
        ) : (
          <div className="fitall-card p-6 text-center">
            <p className="text-base font-semibold text-ink">トレーナープロフィールが見つかりません</p>
            <p className="mt-1 text-subhead text-ink-muted">プロフィール作成後にLINE招待を発行できます</p>
          </div>
        )}

        <InviteFlow />

        <section>
          <h2 className="fitall-group-label">送る前の確認</h2>
          <div className="fitall-group">
            <Link href="/trainer/availability" className="fitall-row">
              <span className="fitall-icon-tile" data-tone="accent"><ClockIcon /></span>
              <span className="fitall-row-main fitall-row-title">空き枠</span>
              <ChevronRightIcon />
            </Link>
            <Link href="/trainer/settings" className="fitall-row">
              <span className="fitall-icon-tile" data-tone="accent"><TicketIcon /></span>
              <span className="fitall-row-main fitall-row-title">料金メニュー</span>
              <ChevronRightIcon />
            </Link>
          </div>
        </section>
      </div>
    </div>
    <div className="fitall-desktop-ui fitall-desktop-page">
      <div className="fitall-desktop-container">
        <header className="fitall-desktop-header">
          <div>
            <p className="fitall-kicker">招待</p>
            <h1 className="fitall-desktop-title">LINE招待</h1>
            <p className="mt-2 text-subhead font-medium text-ink-muted">
              PCでは送信文、アプリ入口、事前チェックを横並びで確認できます。
            </p>
          </div>
          <Link href="/trainer/bookings" className="fitall-secondary-action fitall-tap min-w-[150px]">
            予約管理へ
          </Link>
        </header>

        {preview && (
          <div className="mb-5"><DevPreviewNote>開発用の確認モード（サンプルの招待）</DevPreviewNote></div>
        )}

        <div className="grid grid-cols-[1fr_1.1fr] gap-5">
          <section className="fitall-desktop-card">
            <div className="px-5 pt-5">
              <p className="text-subhead font-semibold text-ink-muted">ご案内の流れ</p>
              <h2 className="mt-1 text-2xl font-bold">LINEからアプリに入り、購入と予約まで進む</h2>
            </div>
            <div className="p-5">
              <div className="fitall-step">
                <span className="fitall-step-num">1</span>
                <div>
                  <p className="text-base font-bold text-ink">LINEで招待を送る</p>
                  <p className="mt-0.5 text-subhead font-medium text-ink-muted">公式LINE運用にそのまま使えます</p>
                </div>
              </div>
              <div className="fitall-step">
                <span className="fitall-step-num">2</span>
                <div>
                  <p className="text-base font-bold text-ink">お客様がメニューを購入</p>
                  <p className="mt-0.5 text-subhead font-medium text-ink-muted">月謝は期限付きチケットとして管理します</p>
                </div>
              </div>
              <div className="fitall-step">
                <span className="fitall-step-num">3</span>
                <div>
                  <p className="text-base font-bold text-ink">予約と通知を自動化</p>
                  <p className="mt-0.5 text-subhead font-medium text-ink-muted">予約、売上、LINE通知へ反映</p>
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-5">
            {trainerProfileId ? (
              <BookingLinkManager trainerProfileId={trainerProfileId} />
            ) : (
              <div className="fitall-desktop-card p-6 text-center">
                <p className="text-base font-bold text-ink">トレーナープロフィールが見つかりません</p>
                <p className="mt-1 text-subhead font-medium text-ink-muted">プロフィール作成後にLINE招待を発行できます</p>
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
