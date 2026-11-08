'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookingManagement } from './BookingManagement'
import type { CustomerBooking } from '@/lib/customer-app'
import { formatJstDateTime } from '@/lib/datetime'
import { DevPreviewNote, PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'

export function CustomerBookingList({ upcomingBookings, pastBookings = [], managementEnabled = false }: {
  upcomingBookings: CustomerBooking[]; pastBookings?: CustomerBooking[]; managementEnabled?: boolean
}) {
  const [notice, setNotice] = useState('')
  const upcoming = upcomingBookings.filter(booking => ['pending', 'confirmed'].includes(booking.status))
    .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at))
  const past = [...pastBookings].sort((a, b) => Date.parse(b.scheduled_at) - Date.parse(a.scheduled_at))
  function row(booking: CustomerBooking) {
    return <li key={booking.id} className="fitall-card p-4">
      <div className="flex items-start justify-between gap-3">
        <time dateTime={booking.scheduled_at} className="block text-lg font-semibold leading-snug text-ink">
          {formatJstDateTime(booking.scheduled_at, { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}
        </time>
        <StatusBadge status={booking.status} />
      </div>
      {managementEnabled && <BookingManagement key={`${booking.id}-${booking.scheduled_at}-${booking.status}`} booking={booking} onSuccess={setNotice} />}
    </li>
  }
  return <main>
    <PageHeader title="予約一覧" back={{ href: '/customer/app/bookings', label: '予約へ戻る' }} />
    <div className="fitall-page-pad space-y-7">
      {!managementEnabled && <DevPreviewNote>開発用の確認モード。変更・キャンセルはできません。</DevPreviewNote>}
      {notice && <p role="status" className="fitall-card-pop rounded-control bg-accent-soft p-3 font-medium text-brand">{notice}</p>}
      <section aria-label="これからの予約">
        <h2 className="fitall-group-label">これからの予約 <span className="font-medium">{upcoming.length}件</span></h2>
        {upcoming.length ? <ul className="space-y-3">{upcoming.map(row)}</ul> : <p className="fitall-card p-5 text-center text-ink-muted">予約はまだありません。</p>}
        <Link href="/customer/app/bookings" className="fitall-primary-action mt-4">新しく予約する</Link>
      </section>
      {past.length > 0 && <section aria-label="過去の予約">
        <h2 className="fitall-group-label">過去の予約</h2>
        <ul className="fitall-group">
          {past.map(booking => <li key={booking.id} className="fitall-row" data-status={booking.status}>
            <time dateTime={booking.scheduled_at} className="fitall-row-main text-base text-ink">
              {formatJstDateTime(booking.scheduled_at, { month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}
            </time>
            <StatusBadge status={booking.status} />
          </li>)}
        </ul>
      </section>}
    </div>
  </main>
}
