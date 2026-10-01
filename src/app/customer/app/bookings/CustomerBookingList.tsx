import Link from 'next/link'
import type { CustomerBooking } from '@/lib/customer-app'
import { formatJstDateTime } from '@/lib/datetime'

function statusLabel(status: string) {
  if (status === 'pending') return '承認待ち'
  if (status === 'confirmed') return '予約確定'
  if (status === 'completed') return '完了'
  if (status === 'cancelled' || status === 'rejected') return 'キャンセル'
  return '状態確認中'
}

export function CustomerBookingList({ upcomingBookings, pastBookings = [] }: {
  upcomingBookings: CustomerBooking[]; pastBookings?: CustomerBooking[]
}) {
  const upcoming = upcomingBookings.filter(booking => ['pending', 'confirmed'].includes(booking.status))
    .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at))
  const past = [...pastBookings].sort((a, b) => Date.parse(b.scheduled_at) - Date.parse(a.scheduled_at))
  function row(booking: CustomerBooking) {
    return <li key={booking.id} className="border-b border-[#DDE8E8] py-5">
      <time dateTime={booking.scheduled_at} className="text-lg font-black">{formatJstDateTime(booking.scheduled_at, { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}</time>
      <p className="mt-2 text-sm text-[#087D78]">{statusLabel(booking.status)}</p>
    </li>
  }
  return <main className="px-4 pt-6 pb-28">
    <h1 className="text-2xl font-black">予約一覧</h1>
    <section className="mt-7" aria-label="これからの予約">
      <h2 className="border-b-2 border-[#0A0A0A] pb-3 text-sm font-bold">これからの予約 <span className="ml-2">{upcoming.length}件</span></h2>
      {upcoming.length ? <ul>{upcoming.map(row)}</ul> : <p className="py-6 text-sm text-[#555555]">予約はまだありません。</p>}
    </section>
    <Link href="/customer/app/bookings" className="fitall-primary-action mt-6 h-12">新しく予約する</Link>
    {past.length > 0 && <section className="mt-8" aria-label="過去の予約"><h2 className="text-sm font-bold">過去の予約</h2><ul>{past.map(row)}</ul></section>}
  </main>
}
