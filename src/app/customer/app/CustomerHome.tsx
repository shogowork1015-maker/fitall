import Link from 'next/link'
import type { CustomerAppData } from '@/lib/customer-app'
import { formatJstDateTime } from '@/lib/datetime'

export function CustomerHome({ data }: { data: Pick<CustomerAppData, 'customer' | 'trainer' | 'tickets' | 'upcomingBookings'> }) {
  const remaining = data.tickets.reduce((sum, ticket) => sum + ticket.remaining, 0)
  const scheduled = data.tickets.reduce((sum, ticket) => sum + ticket.scheduled, 0)
  const next = data.upcomingBookings.find(booking => booking.status === 'pending' || booking.status === 'confirmed')
  return <main className="space-y-4 px-4 pt-6 pb-8">
    <header>
      <h1 className="text-2xl font-black leading-tight">{data.customer.name}さん</h1>
      <p className="mt-1 text-ink-muted">担当 {data.trainer.name}さん</p>
    </header>
    <section className="fitall-card p-5" aria-label="残りチケット">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-bold">使えるチケット</p>
          <p className="mt-1 text-6xl font-black leading-none">{remaining}<span className="ml-1.5 text-xl">枚</span></p>
        </div>
        {scheduled > 0 && <p className="text-ink-muted">予約に使用中 {scheduled}枚</p>}
      </div>
      <Link href={remaining > 0 ? '/customer/app/bookings' : '/customer/app/tickets'} className="fitall-primary-action mt-5">
        {remaining > 0 ? 'チケットで予約する' : 'チケットを購入する'}
      </Link>
      {remaining > 0 && <Link href="/customer/app/tickets" className="mt-1 flex min-h-14 items-center justify-center font-bold text-brand">チケットを確認・買い足す</Link>}
    </section>
    <section className="fitall-card p-5" aria-label="次の予約">
      <div className="flex min-h-14 items-center justify-between -my-3">
        <h2 className="font-bold">次の予約</h2>
        <Link href="/customer/app/bookings/list" className="inline-flex min-h-14 items-center font-bold text-brand">予約一覧 ›</Link>
      </div>
      {next ? <div className="mt-3">
        <p className="text-xl font-black leading-snug">{formatJstDateTime(next.scheduled_at, { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}</p>
        <p className="mt-1 text-brand">{next.status === 'pending' ? '承認待ち' : '予約確定'}</p>
      </div> : <p className="mt-3 text-ink-muted">次の予約はまだありません。</p>}
    </section>
    <section className="fitall-card p-5" aria-label="購入済みメニュー">
      <h2 className="font-bold">購入済みメニュー</h2>
      {data.tickets.map(ticket => <div key={ticket.id} className="flex justify-between gap-4 border-t border-line py-3 first-of-type:mt-3 last:pb-0">
        <div><p className="font-bold">{ticket.title}</p><p className="mt-0.5 text-ink-muted">{ticket.expiresLabel}</p></div>
        <p className="shrink-0 font-bold">残り {ticket.remaining}枚</p>
      </div>)}
      {!data.tickets.length && <p className="mt-3 text-ink-muted">購入済みのチケットはありません。</p>}
    </section>
  </main>
}
