'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookingManagement } from './BookingManagement'
import type { CustomerBooking } from '@/lib/customer-app'
import { formatJstDate, formatJstTime } from '@/lib/datetime'
import { DevPreviewNote, PageHeader } from '@/components/ui/PageHeader'
import { StatusTag, statusLabel } from '@/components/ui/StatusBadge'

export function CustomerBookingList({ upcomingBookings, pastBookings = [], managementEnabled = false }: {
  upcomingBookings: CustomerBooking[]; pastBookings?: CustomerBooking[]; managementEnabled?: boolean
}) {
  const [notice, setNotice] = useState('')
  const upcoming = upcomingBookings.filter(booking => ['pending', 'confirmed'].includes(booking.status))
    .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at))
  const past = [...pastBookings].sort((a, b) => Date.parse(b.scheduled_at) - Date.parse(a.scheduled_at))
  function row(booking: CustomerBooking) {
    return <li key={booking.id} className="fitall-booking-card" data-status={booking.status}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="fitall-row-title">
            <StatusTag status={booking.status} />
            <time dateTime={booking.scheduled_at} className="truncate">
              {formatJstDate(booking.scheduled_at, { month: 'long', day: 'numeric', weekday: 'short' })}
            </time>
          </p>
          <p className={`fitall-row-meta ${booking.status === 'pending' ? '!text-warn' : ''}`}>{statusLabel(booking.status)}</p>
        </div>
        <p className="fitall-row-figure">{formatJstTime(booking.scheduled_at)}</p>
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
        <h2 className="fitall-group-label"><span>これからの予約</span><span>{upcoming.length}件</span></h2>
        {upcoming.length ? <ul className="space-y-2.5">{upcoming.map(row)}</ul> : <p className="fitall-card p-5 text-center text-ink-muted">予約はまだありません。</p>}
        <Link href="/customer/app/bookings" className="fitall-primary-action mt-4">新しく予約する</Link>
      </section>
      {past.length > 0 && <section aria-label="過去の予約">
        <h2 className="fitall-group-label">過去の予約</h2>
        <ul className="fitall-group">
          {past.map(booking => <li key={booking.id} className="fitall-row" data-status={booking.status}>
            <p className="fitall-row-main fitall-row-title">
              <StatusTag status={booking.status} />
              <time dateTime={booking.scheduled_at}>{formatJstDate(booking.scheduled_at, { month: 'long', day: 'numeric', weekday: 'short' })}</time>
            </p>
            <span className="text-subhead font-semibold tabular-nums text-ink-muted">{formatJstTime(booking.scheduled_at)}</span>
          </li>)}
        </ul>
      </section>}
    </div>
  </main>
}
