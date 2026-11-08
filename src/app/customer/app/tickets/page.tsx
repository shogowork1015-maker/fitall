import Link from 'next/link'
import { loadCustomerAppData, loadCustomerAppEntryData } from '@/lib/customer-app'
import { createCustomerTicketCheckoutAction } from './actions'
import { TicketPurchaseForm } from './TicketPurchaseForm'
import { DevPreviewNote, PageHeader } from '@/components/ui/PageHeader'

interface PageProps {
  searchParams?: Promise<{
    purchase?: string
    trainer_id?: string
  }>
}

function lineShareUrl(message: string) {
  return `https://social-plugins.line.me/lineit/share?text=${encodeURIComponent(message)}`
}

function purchaseMessage(status?: string) {
  if (status === 'success') return 'チケット購入が完了しました。反映まで数秒かかる場合があります。'
  if (status === 'cancelled') return '購入がキャンセルされました。'
  if (status === 'failed') return 'Stripe決済ページの作成に失敗しました。設定を確認してください。'
  if (status === 'missing-plan') return 'メニューが見つかりません。'
  if (status === 'unavailable') return 'このメニューは現在購入できません。'
  if (status === 'invalid') return 'メニュー情報が正しくありません。'
  return null
}

export default async function CustomerTicketsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const data = await loadCustomerAppData()
  const entryData = data ? null : await loadCustomerAppEntryData(params?.trainer_id)
  const message = purchaseMessage(params?.purchase)
  const availableTicketCount = data?.tickets.reduce((sum, ticket) => sum + ticket.remaining, 0) ?? 0

  return (
    <main>
      <PageHeader title="チケット" subtitle={data ? `使えるチケット ${availableTicketCount}枚` : undefined} />

      {!data ? (
        <div className="fitall-page-pad">
          <section className="fitall-card p-5">
            <p className="text-subhead font-medium text-ink-muted">はじめての方</p>
            <h2 className="mt-1 text-xl font-bold text-ink">チケットの購入が必要です</h2>
            <p className="mt-2 text-subhead leading-relaxed text-ink-muted">
              メニューを購入するとチケットが追加され、予約日時を選べるようになります。
            </p>
            {entryData ? (
              <>
                <div className="fitall-row mt-4 !px-0">
                  <span className="fitall-avatar">{entryData.trainer.name[0] ?? '?'}</span>
                  <div className="fitall-row-main">
                    <p className="text-subhead text-ink-muted">担当トレーナー</p>
                    <p className="fitall-row-title">{entryData.trainer.name}さん</p>
                  </div>
                </div>
                <Link href={`/book/${entryData.trainer.profileId}`} className="fitall-primary-action mt-4">
                  チケットを購入する
                </Link>
              </>
            ) : (
              <p className="mt-4 rounded-control bg-surface-soft px-4 py-4 text-center text-subhead text-ink-muted">
                LINEの登録リンクから開き直してください
              </p>
            )}
          </section>
        </div>
      ) : (
        <div className="fitall-page-pad space-y-7">
          {data.preview && <DevPreviewNote>開発用の確認モード。購入はできません。</DevPreviewNote>}
          {message && (
            <p role="status" className="rounded-control bg-accent-soft px-4 py-3 text-base font-semibold text-brand">
              {message}
            </p>
          )}

          <section aria-label="お持ちのチケット" className="space-y-3">
            {data.tickets.map((ticket) => (
              <article key={ticket.id} className="fitall-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="fitall-badge" data-tone="accent">{ticket.kind === 'monthly' ? '月謝' : '回数券'}</span>
                    <h2 className="mt-2 text-lg font-semibold text-ink">{ticket.title}</h2>
                    <p className="mt-0.5 text-subhead text-ink-muted">{ticket.expiresLabel}</p>
                  </div>
                  <p className="fitall-figure text-right text-[40px]">
                    {ticket.remaining}<small>/ {ticket.total}枚</small>
                  </p>
                </div>

                {/* 1枚ずつの状態を並べ、残り・予約済み・使用済みがひと目で分かるようにする */}
                <div aria-hidden="true" className="mt-4 flex gap-1.5">
                  {Array.from({ length: Math.min(ticket.total, 12) }, (_, index) => {
                    const tone = index < ticket.used
                      ? 'bg-line'
                      : index < ticket.used + ticket.scheduled
                        ? 'bg-accent/40'
                        : 'bg-accent'
                    return <span key={index} className={`h-2 flex-1 rounded-full ${tone}`} />
                  })}
                </div>
                <p className="fitall-row-meta mt-2">
                  <span>残り {ticket.remaining}</span>
                  <span>予約済み {ticket.scheduled}</span>
                  <span>使用済み {ticket.used}</span>
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {ticket.remaining > 0 ? (
                    <Link href="/customer/app/bookings" className="fitall-tinted-action">予約する</Link>
                  ) : (
                    <a href="#purchase-menu" className="fitall-tinted-action">買い足す</a>
                  )}
                  <a
                    href={lineShareUrl(`${data.trainer.name}さん、${ticket.title}の繰越について相談したいです。\n${data.customer.name}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="fitall-secondary-action"
                  >
                    繰越を相談
                  </a>
                </div>
              </article>
            ))}
            {!data.tickets.length && (
              <div className="fitall-card p-5 text-center">
                <p className="text-base font-semibold text-ink">使えるチケットがありません</p>
                <p className="mt-2 text-subhead leading-relaxed text-ink-muted">
                  下のメニューから購入すると、そのまま予約できます。
                </p>
              </div>
            )}
          </section>

          <section id="purchase-menu" className="scroll-mt-24">
            <h2 className="fitall-group-label">
              <span>買い足す</span>
              <span className="font-medium">カード決済（Stripe）</span>
            </h2>
            <div className="space-y-3">
              {data.menus.map((menu) => (
                <div key={menu.id} className="fitall-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-ink">{menu.name}</h3>
                      <p className="mt-0.5 text-subhead text-ink-muted">
                        {menu.billing_type === 'monthly' ? `月謝・毎月${menu.sessions}枚` : `${menu.sessions}枚`}
                        {menu.description ? `・${menu.description}` : ''}
                      </p>
                    </div>
                    <p className="fitall-figure text-right text-xl">
                      ¥{menu.price.toLocaleString()}
                      {menu.billing_type === 'monthly' && <small>/月</small>}
                    </p>
                  </div>
                  <TicketPurchaseForm planId={menu.id} checkoutAction={createCustomerTicketCheckoutAction} preview={data.preview} />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="fitall-group-label">お知らせについて</h2>
            <ul className="fitall-group">
              <li className="fitall-row text-subhead text-ink-muted">予約確定と前日リマインドはLINEで届きます。</li>
              <li className="fitall-row text-subhead text-ink-muted">回数券が0枚になると、LINEで追加のご案内が届きます。</li>
              <li className="fitall-row text-subhead text-ink-muted">月謝チケットは月末で期限切れになります。繰越はトレーナーに相談できます。</li>
            </ul>
          </section>
        </div>
      )}
    </main>
  )
}
