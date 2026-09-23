import Link from 'next/link'
import { loadCustomerAppData, loadCustomerAppEntryData } from '@/lib/customer-app'
import { TicketPurchaseForm } from './TicketPurchaseForm'

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
    <main className="pb-28">
      <header className="sticky top-0 z-20 border-b-2 border-[#DDE8E8] bg-white/95 px-4 py-4 backdrop-blur">
        <p className="text-[10px] font-black tracking-[0.16em] text-[#087D78]">TICKETS</p>
        <h1 className="mt-1 text-2xl font-black text-[#0A0A0A]">チケット</h1>
      </header>

      {!data ? (
        <div className="px-4 py-6">
          <div className="fitall-card-strong overflow-hidden">
            <div className="bg-[#12C7BE] px-4 py-5 text-white">
              <p className="text-[10px] font-black tracking-[0.12em] text-white/80">FIRST TIME</p>
              <h2 className="mt-1 text-2xl font-black">チケット登録が必要です</h2>
              <p className="mt-2 text-sm font-bold leading-relaxed text-white/90">
                まだお客様情報がないため、初回予約からチケット購入と登録を行います。
              </p>
            </div>
            <div className="space-y-3 p-4">
              {entryData ? (
                <>
                  <div className="border-2 border-[#DDE8E8] bg-white px-3 py-3">
                    <p className="text-[10px] font-black text-[#087D78]">TRAINER</p>
                    <p className="mt-1 text-sm font-black text-[#0A0A0A]">
                      {entryData.trainer.name}さん
                    </p>
                  </div>
                  <Link
                    href={`/book/${entryData.trainer.profileId}`}
                    className="fitall-primary-action fitall-tap h-12 text-sm"
                  >
                    初回予約へ進む
                  </Link>
                </>
              ) : (
                <div className="border-2 border-dashed border-[#DDE8E8] bg-[#F4F7F7] px-4 py-5 text-center text-sm font-black text-[#555555]">
                  LINEの登録リンクから開き直してください
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 px-4 py-5">
          {message && (
            <div className="border-2 border-[#DDE8E8] bg-[#F4F7F7] px-3 py-3 text-sm font-black text-[#0A0A0A]">
              {message}
            </div>
          )}

          <section className="fitall-card-strong overflow-hidden">
            <div className="bg-[#12C7BE] px-4 py-4 text-white">
              <p className="text-[10px] font-black tracking-[0.12em] text-white/80">BALANCE</p>
              <h2 className="mt-1 text-xl font-black">
                使えるチケット {availableTicketCount}枚
              </h2>
              <p className="mt-1 text-sm font-bold text-white/90">
                {availableTicketCount > 0
                  ? '月謝分は期限に注意してください'
                  : '予約するには追加購入か繰越相談が必要です'}
              </p>
            </div>
          </section>

          <div className="space-y-3">
            {data.tickets.map((ticket) => (
              <section key={ticket.id} className="fitall-card overflow-hidden">
                <div className="grid grid-cols-[112px_1fr]">
                  <div className="flex min-h-[136px] flex-col justify-between bg-[#12C7BE] p-3 text-white">
                    <div>
                      <p className="text-[10px] font-black text-white/80">
                        {ticket.kind === 'monthly' ? '月謝' : '回数券'}
                      </p>
                      <p className="mt-3 text-4xl font-black">{ticket.remaining}</p>
                      <p className="text-[11px] font-black text-white/80">/ {ticket.total}枚</p>
                    </div>
                    <p className="text-[10px] font-black text-white/80">{ticket.expiresLabel}</p>
                  </div>
                  <div className="space-y-3 p-4">
                    <div>
                      <h2 className="text-base font-black text-[#0A0A0A]">{ticket.title}</h2>
                      <p className="mt-1 text-xs font-bold leading-relaxed text-[#555555]">{ticket.note}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="border-2 border-[#DDE8E8] px-2 py-2">
                        <p className="text-lg font-black text-[#0A0A0A]">{ticket.scheduled}</p>
                        <p className="text-[10px] font-black text-[#555555]">予約済み</p>
                      </div>
                      <div className="border-2 border-[#DDE8E8] px-2 py-2">
                        <p className="text-lg font-black text-[#0A0A0A]">{ticket.used}</p>
                        <p className="text-[10px] font-black text-[#555555]">使用済み</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {ticket.remaining > 0 ? (
                        <Link href="/customer/app/bookings" className="fitall-primary-action fitall-tap h-11 text-xs">
                          予約する
                        </Link>
                      ) : (
                        <a href="#purchase-menu" className="fitall-primary-action fitall-tap h-11 text-xs">
                          追加購入
                        </a>
                      )}
                      <a
                        href={lineShareUrl(
                          `${data.trainer.name}さん、${ticket.title}の繰越について相談したいです。\n${data.customer.name}`
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="fitall-secondary-action fitall-tap h-11 text-xs"
                      >
                        繰越相談
                      </a>
                    </div>
                  </div>
                </div>
              </section>
            ))}
            {!data.tickets.length && (
              <section className="fitall-card p-5 text-center">
                <p className="text-sm font-black text-[#0A0A0A]">使えるチケットがありません</p>
                <p className="mt-2 text-xs font-bold leading-relaxed text-[#555555]">
                  下のメニューから購入すると、予約カレンダーでそのまま予約できます。
                </p>
              </section>
            )}
          </div>

          <section id="purchase-menu" className="fitall-card scroll-mt-24 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="fitall-section-title">追加購入</h2>
              <span className="fitall-pill fitall-pill-aqua">Stripe決済</span>
            </div>
            <div className="space-y-2">
              {data.menus.map((menu) => (
                <div key={menu.id} className="border-2 border-[#DDE8E8] bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black text-[#087D78]">
                        {menu.billing_type === 'monthly' ? `月謝 / 毎月${menu.sessions}枚` : `回数券 / ${menu.sessions}枚`}
                      </p>
                      <h3 className="mt-1 text-sm font-black text-[#0A0A0A]">{menu.name}</h3>
                      <p className="mt-1 text-xs font-bold leading-relaxed text-[#555555]">
                        {menu.description || '購入後、そのまま予約へ進めます。'}
                      </p>
                    </div>
                    <p className="text-right text-sm font-black text-[#0A0A0A]">
                      ¥{menu.price.toLocaleString()}
                      {menu.billing_type === 'monthly' && (
                        <span className="block text-[10px] text-[#087D78]">毎月</span>
                      )}
                    </p>
                  </div>
                  <TicketPurchaseForm planId={menu.id} />
                </div>
              ))}
            </div>
          </section>

          <section className="fitall-card p-4">
            <h2 className="fitall-section-title">自動通知</h2>
            <div className="mt-3 space-y-2 text-sm font-bold leading-relaxed text-[#555555]">
              <p>予約確定と前日リマインドはLINEで受け取れます。</p>
              <p>回数券が0枚になると、LINEで追加案内が届きます。</p>
              <p>月謝チケットは月末で期限切れになります。繰越はトレーナー側で調整できます。</p>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
