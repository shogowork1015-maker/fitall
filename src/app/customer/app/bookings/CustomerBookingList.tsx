'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookingManagement } from './BookingManagement'
import type { CustomerBooking } from '@/lib/customer-app'
import { formatJstDateTime } from '@/lib/datetime'

function statusLabel(status: string) {
  if (status === 'pending') return '承認待ち'
  if (status === 'confirmed') return '予約確定'
  if (status === 'completed') return '完了'
  if (status === 'cancelled' || status === 'rejected') return 'キャンセル'
  return '状態確認中'
}

export function CustomerBookingList({ upcomingBookings, pastBookings = [], managementEnabled = false }: {
  upcomingBookings: CustomerBooking[]; pastBookings?: CustomerBooking[]; managementEnabled?: boolean
}) {
  const [notice, setNotice] = useState('')
  const upcoming = upcomingBookings.filter(booking => ['pending', 'confirmed'].includes(booking.status))
    .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at))
  const past = [...pastBookings].sort((a, b) => Date.parse(b.scheduled_at) - Date.parse(a.scheduled_at))
  function row(booking: CustomerBooking) {
    return <li key={booking.id} className="fitall-card fitall-card-pop p-4">
      <time dateTime={booking.scheduled_at} className="block text-lg font-black leading-snug">{formatJstDateTime(booking.scheduled_at, { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}</time>
      <p className="mt-1 text-brand">{statusLabel(booking.status)}</p>
      {managementEnabled && <BookingManagement key={`${booking.id}-${booking.scheduled_at}-${booking.status}`} booking={booking} onSuccess={setNotice} />}
    </li>
  }
  return <main className="px-4 pt-6 pb-8">
    <h1 className="text-2xl font-black">予約一覧</h1>
    {notice && <p role="status" className="fitall-card-pop mt-4 rounded-control bg-accent-soft p-3 font-medium text-brand">{notice}</p>}
    <section className="mt-7" aria-label="これからの予約">
      <h2 className="mb-3 flex justify-between font-bold">これからの予約 <span className="font-medium text-ink-muted">{upcoming.length}件</span></h2>
      {upcoming.length ? <ul className="space-y-3">{upcoming.map(row)}</ul> : <p className="rounded-card border border-dashed border-line bg-white p-5 text-center text-ink-muted">予約はまだありません。</p>}
    </section>
    <Link href="/customer/app/bookings" className="fitall-primary-action mt-5">新しく予約する</Link>
    {past.length > 0 && <section className="mt-8" aria-label="過去の予約"><h2 className="mb-3 font-bold">過去の予約</h2><ul className="space-y-3">{past.map(row)}</ul></section>}
  </main>
}
