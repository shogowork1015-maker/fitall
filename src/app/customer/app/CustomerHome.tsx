import Link from 'next/link'
import type { CustomerAppData } from '@/lib/customer-app'
import { formatJstDate, formatJstTime } from '@/lib/datetime'
import { DevPreviewNote, PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ChevronRightIcon, TicketIcon } from '@/components/ui/Icons'

export function CustomerHome({ data }: { data: Pick<CustomerAppData, 'customer' | 'trainer' | 'tickets' | 'upcomingBookings'> & { preview?: boolean } }) {
  const remaining = data.tickets.reduce((sum, ticket) => sum + ticket.remaining, 0)
  const scheduled = data.tickets.reduce((sum, ticket) => sum + ticket.scheduled, 0)
  const next = data.upcomingBookings.find(booking => booking.status === 'pending' || booking.status === 'confirmed')

  return (
    <main>
      <PageHeader title={`${data.customer.name}さん`} subtitle={`担当 ${data.trainer.name}さん`} />

      <div className="fitall-page-pad space-y-7">
        {data.preview && <DevPreviewNote>開発用の確認モード（サンプル表示）</DevPreviewNote>}

        <section className="fitall-card p-5" aria-label="残りチケット">
          <p className="text-base font-medium text-ink-muted">使えるチケット</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <p className="fitall-figure text-[56px]">{remaining}<small className="!text-xl">枚</small></p>
            {scheduled > 0 && <span className="fitall-badge mb-2">予約で使用中 {scheduled}枚</span>}
          </div>
          <Link href={remaining > 0 ? '/customer/app/bookings' : '/customer/app/tickets'} className="fitall-primary-action mt-5">
            {remaining > 0 ? 'チケットで予約する' : 'チケットを購入する'}
          </Link>
          {remaining > 0 && (
            <Link href="/customer/app/tickets" className="mt-2 flex min-h-14 items-center justify-center font-semibold text-brand">
              チケットを買い足す
            </Link>
          )}
        </section>

        <section aria-label="次の予約">
          <h2 className="fitall-group-label">
            <span>次の予約</span>
            <Link href="/customer/app/bookings/list" className="inline-flex min-h-14 items-center">予約一覧</Link>
          </h2>
          {next ? (
            <Link href="/customer/app/bookings/list" className="fitall-card flex items-center gap-4 p-4">
              {/* カレンダーの1枚のように日付を大きく見せる */}
              <div className="flex h-16 w-16 flex-none flex-col items-center justify-center rounded-control bg-accent-soft text-brand">
                <span className="text-base font-semibold leading-none">{formatJstDate(next.scheduled_at, { month: 'numeric' })}</span>
                <span className="fitall-figure mt-1 text-2xl !text-brand">{formatJstDate(next.scheduled_at, { day: 'numeric' }).replace('日', '')}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-ink">
                  {formatJstDate(next.scheduled_at, { weekday: 'short' })}曜日 {formatJstTime(next.scheduled_at)}
                </p>
                <div className="mt-1"><StatusBadge status={next.status} /></div>
              </div>
              <ChevronRightIcon />
            </Link>
          ) : (
            <div className="fitall-card px-5 py-5 text-base text-ink-muted">次の予約はまだありません。</div>
          )}
        </section>

        <section aria-label="購入済みのチケット">
          <h2 className="fitall-group-label">購入済みのチケット</h2>
          {data.tickets.length ? (
            <div className="fitall-group">
              {data.tickets.map(ticket => (
                <div key={ticket.id} className="fitall-row" data-inset="avatar">
                  <span className="fitall-icon-tile" data-tone="accent"><TicketIcon /></span>
                  <div className="fitall-row-main">
                    <p className="fitall-row-title">{ticket.title}</p>
                    <p className="fitall-row-meta"><span>{ticket.expiresLabel}</span></p>
                  </div>
                  <span className="text-base font-semibold text-ink">残り {ticket.remaining}枚</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="fitall-group px-5 py-5 text-base text-ink-muted">購入済みのチケットはありません。</div>
          )}
        </section>
      </div>
    </main>
  )
}
