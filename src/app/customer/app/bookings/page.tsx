import Link from 'next/link'
import { loadCustomerAppData, loadCustomerAppEntryData } from '@/lib/customer-app'
import { formatJstDate, formatJstTime } from '@/lib/datetime'
import { createCustomerBookingAction } from './actions'
import { CustomerWeekCalendar } from './CustomerWeekCalendar'

interface PageProps {
  searchParams?: Promise<{
    booked?: string
    trainer_id?: string
  }>
}

function formatDate(value: string) {
  return formatJstDate(value, {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  })
}

function formatTime(value: string) {
  return formatJstTime(value, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusLabel(status: string) {
  if (status === 'pending') return '承認待ち'
  if (status === 'confirmed') return '確定'
  if (status === 'completed') return '完了'
  return 'キャンセル'
}

function lineShareUrl(message: string) {
  return `https://social-plugins.line.me/lineit/share?text=${encodeURIComponent(message)}`
}

export default async function CustomerBookingsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const data = await loadCustomerAppData()
  const entryData = data ? null : await loadCustomerAppEntryData(params?.trainer_id)
  const availableTicketCount = data?.tickets.reduce((sum, ticket) => sum + ticket.remaining, 0) ?? 0

  return (
    <main className="pb-8">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 px-4 pb-3 pt-[calc(12px+var(--fitall-safe-top))] backdrop-blur">
        <h1 className="text-2xl font-black text-ink">予約</h1>
      </header>

      {!data ? (
        <div className="px-4 py-6">
          <div className="fitall-card-strong overflow-hidden">
            <div className="bg-accent px-4 py-5 text-ink">
              <p className="text-base font-bold text-ink/70">はじめての方</p>
              <h2 className="mt-1 text-2xl font-black">チケットを購入して予約</h2>
              <p className="mt-2 text-base font-bold leading-relaxed text-ink/70">
                まだお客様情報がないため、メニューを購入してチケットを追加します。予約日時は購入後に選べます。
              </p>
            </div>
            <div className="space-y-3 p-4">
              {entryData ? (
                <>
                  <div className="border border-line bg-white px-3 py-3">
                    <p className="text-base font-bold text-brand">担当トレーナー</p>
                    <p className="mt-1 text-base font-bold text-ink">
                      {entryData.trainer.name}さん
                    </p>
                  </div>
                  <Link
                    href={`/book/${entryData.trainer.profileId}`}
                    className="fitall-primary-action fitall-tap h-12 text-base"
                  >
                    チケットを購入する
                  </Link>
                </>
              ) : (
                <div className="border-2 border-dashed border-line bg-surface-soft px-4 py-5 text-center text-base font-medium text-ink-muted">
                  LINEの登録リンクから開き直してください
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 px-4 py-5">
          {params?.booked === '1' && (
            <div className="border border-accent bg-accent-soft px-3 py-3 text-base font-bold text-brand">
              予約が確定しました。チケットを1枚使用予定にしました。
            </div>
          )}

          <section className="fitall-card p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="fitall-section-title">使えるチケット</p>
                <h2 className="mt-1 text-2xl font-black text-ink">残り {availableTicketCount}枚</h2>
              </div>
              <Link href="/customer/app/tickets" className="fitall-pill fitall-pill-aqua">
                詳細
              </Link>
            </div>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {data.tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="w-[172px] shrink-0 border border-line bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-bold text-brand">
                        {ticket.kind === 'monthly' ? '月謝' : '回数券'}
                      </p>
                      <p className="mt-1 line-clamp-2 text-base font-bold leading-tight text-ink">
                        {ticket.title}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black leading-none text-ink">{ticket.remaining}</p>
                      <p className="text-base font-medium text-ink-muted">/ {ticket.total}枚</p>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-line pt-2">
                    <p className="text-base font-medium text-ink-muted">有効期限</p>
                    <p className="mt-0.5 text-base font-bold text-ink">{ticket.expiresLabel}</p>
                  </div>
                </div>
              ))}
              {!data.tickets.length && (
                <div className="w-full border-2 border-dashed border-line bg-surface-soft px-4 py-5 text-center text-base font-medium text-ink-muted">
                  使えるチケットがありません
                </div>
              )}
            </div>
          </section>

          <section className="fitall-card-strong overflow-hidden">
            <div className="bg-accent px-4 py-4 text-ink">
              <p className="text-base font-bold text-ink/70">空き枠</p>
              <h2 className="mt-1 text-xl font-black">
                {availableTicketCount > 0 ? 'チケットで予約する' : '空き時間を確認'}
              </h2>
              <p className="mt-1 text-base font-bold text-white/90">
                {availableTicketCount > 0
                  ? '日時を選んで、チケットを1枚使用します'
                  : 'チケット購入後にこの画面から予約できます'}
              </p>
            </div>
            <CustomerWeekCalendar
              availability={data.availability}
              availableTicketCount={availableTicketCount}
              bookingAction={data.preview ? undefined : createCustomerBookingAction}
            />
          </section>

          <section className="fitall-card p-4">
            <h2 className="fitall-section-title">これからの予約</h2>
            <div className="mt-3 space-y-2">
              {data.upcomingBookings.length ? (
                data.upcomingBookings.map((booking) => (
                  <div key={booking.id} className="grid grid-cols-[64px_1fr_auto] items-center gap-3 border border-line bg-white px-3 py-3">
                    <div className="text-center">
                      <p className="text-lg font-black text-ink">{formatDate(booking.scheduled_at).split(' ')[0]}</p>
                      <p className="text-base font-medium text-ink-muted">{formatDate(booking.scheduled_at).split(' ')[1] ?? ''}</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-ink">{formatTime(booking.scheduled_at)} セッション</p>
                    </div>
                    <span className="bg-accent-soft px-2 py-1 text-base font-bold text-brand">
                      {statusLabel(booking.status)}
                    </span>
                    <a
                      href={lineShareUrl(
                        `${data.trainer.name}さん、${formatDate(booking.scheduled_at)} ${formatTime(booking.scheduled_at)}の予約変更を相談したいです。\n${data.customer.name}`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="col-span-3 h-10 rounded-control border border-line bg-white px-3 text-center text-base font-bold leading-9 text-ink"
                    >
                      LINEで変更相談
                    </a>
                  </div>
                ))
              ) : (
                <div className="border-2 border-dashed border-line bg-surface-soft px-4 py-6 text-center text-base font-medium text-ink-muted">
                  次回予約はまだありません
                </div>
              )}
            </div>
          </section>

          <section className="fitall-card p-4">
            <h2 className="fitall-section-title">過去の予約</h2>
            <div className="mt-3 space-y-2">
              {data.pastBookings.slice(0, 8).map((booking) => (
                <div key={booking.id} className="flex items-center justify-between border-b border-line py-3 last:border-b-0">
                  <div>
                    <p className="text-base font-bold text-ink">{formatDate(booking.scheduled_at)} {formatTime(booking.scheduled_at)}</p>
                    <p className="mt-0.5 text-base font-medium text-ink-muted">{statusLabel(booking.status)}</p>
                  </div>
                  <p className="text-base font-bold text-ink">{booking.price > 0 ? `¥${booking.price.toLocaleString()}` : ''}</p>
                </div>
              ))}
              {!data.pastBookings.length && (
                <p className="py-4 text-center text-base font-medium text-ink-muted">履歴はまだありません</p>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
