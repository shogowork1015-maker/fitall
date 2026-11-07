import Link from 'next/link'
import type { CustomerAppData } from '@/lib/customer-app'
import { formatJstDateTime } from '@/lib/datetime'

export function CustomerHome({ data }: { data: Pick<CustomerAppData, 'customer' | 'trainer' | 'tickets' | 'upcomingBookings'> }) {
  const remaining = data.tickets.reduce((sum, ticket) => sum + ticket.remaining, 0)
  const scheduled = data.tickets.reduce((sum, ticket) => sum + ticket.scheduled, 0)
  const next = data.upcomingBookings.find(booking => booking.status === 'pending' || booking.status === 'confirmed')
  return <main className="px-4 pt-6 pb-28">
    <header className="mb-7">
      <p className="text-[11px] font-black tracking-widest text-[#087D78]">LIMITLESS APP</p>
      <h1 className="mt-2 text-2xl font-black">{data.customer.name}さん</h1>
      <p className="mt-2 text-xs text-[#555555]">{data.trainer.name}さん</p>
    </header>
    <section className="border-y-2 border-[#0A0A0A] py-6" aria-label="残りチケット">
      <p className="text-sm font-bold">使えるチケット</p>
      <p className="mt-2 text-5xl font-black">{remaining}<span className="ml-2 text-base">枚</span></p>
      <p className="mt-3 text-xs text-[#555555]">予約に使用中 {scheduled}枚</p>
      <Link href={remaining > 0 ? '/customer/app/bookings' : '/customer/app/tickets'} className="fitall-primary-action mt-5 h-14 w-full">
        {remaining > 0 ? 'チケットで予約する' : 'チケットを購入する'}
      </Link>
      {remaining > 0 && <Link href="/customer/app/tickets" className="mt-3 flex min-h-11 items-center justify-center text-sm font-bold text-[#087D78] underline underline-offset-4">チケットを確認・買い足す</Link>}
    </section>
    <section className="py-6" aria-label="次の予約">
      <div className="flex items-center justify-between"><h2 className="text-sm font-bold">次の予約</h2><Link href="/customer/app/bookings/list" className="text-xs font-bold text-[#087D78] underline">予約一覧</Link></div>
      {next ? <>
        <p className="mt-4 text-xl font-black">{formatJstDateTime(next.scheduled_at, { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}</p>
        <p className="mt-2 text-sm text-[#555555]">{next.status === 'pending' ? '承認待ち' : '予約確定'}</p>
      </> : <p className="mt-4 text-sm text-[#555555]">次の予約はまだありません。</p>}
    </section>
    <section className="border-t border-[#DDE8E8] pt-5" aria-label="購入済みメニュー">
      <h2 className="text-sm font-bold">購入済みメニュー</h2>
      {data.tickets.map(ticket => <div key={ticket.id} className="flex justify-between gap-4 border-b border-[#DDE8E8] py-4">
        <div><p className="text-sm font-bold">{ticket.title}</p><p className="mt-1 text-xs text-[#555555]">{ticket.expiresLabel}</p></div>
        <p className="shrink-0 text-sm font-bold">残り {ticket.remaining}枚</p>
      </div>)}
      {!data.tickets.length && <p className="mt-3 text-sm text-[#555555]">購入済みのチケットはありません。</p>}
    </section>
  </main>
}
