'use client'

import Link from 'next/link'
import { useState, type CSSProperties } from 'react'
import { formatJstTime } from '@/lib/datetime'

export type HomeBooking = {
  id: string
  scheduled_at: string
  status: string
  trainee_name: string
  price?: number | null
}

type Filter = 'all' | 'confirmed' | 'pending'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全て' },
  { value: 'confirmed', label: '確定' },
  { value: 'pending', label: '承認待ち' },
]

// 状態ごとの1文字の札と、右下に出す説明
const STATUS: Record<string, { tag: string; label: string }> = {
  confirmed: { tag: '確', label: '確定' },
  pending: { tag: '待', label: '承認待ち' },
  completed: { tag: '完', label: '完了' },
  cancelled: { tag: '消', label: 'キャンセル' },
}

function yen(amount: number) {
  return `¥${amount.toLocaleString()}`
}

// スマホのホーム画面。iPhone標準アプリと同じ文字・ボタンの大きさで組む
export function TrainerHomeMobile({
  todayLabel,
  monthLabel,
  totalSales,
  salesError,
  clientCount,
  pendingCount,
  todayBookings,
  preview = false,
}: {
  todayLabel: string
  monthLabel: string
  totalSales: number | null
  salesError?: string
  clientCount: number
  pendingCount: number
  todayBookings: HomeBooking[]
  preview?: boolean
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const count = (value: Filter) =>
    value === 'all' ? todayBookings.length : todayBookings.filter((b) => b.status === value).length
  const shown = filter === 'all' ? todayBookings : todayBookings.filter((b) => b.status === filter)
  const filterIndex = FILTERS.findIndex((f) => f.value === filter)

  return (
    <div className="ios">
      <header className="ios-navbar">
        <Link href="/trainer/settings" aria-label="設定" className="ios-round">
          <span><GearIcon /></span>
        </Link>
        <h1>ホーム</h1>
        <Link href="/trainer/bookings" aria-label="予約を入れる" className="ios-round" data-tone="ink">
          <span><PlusIcon /></span>
        </Link>
      </header>

      <div className="ios-content">
        {preview && <p className="ios-footnote mb-3 text-center">確認モード（サンプル表示・保存されません）</p>}

        <div
          role="group"
          aria-label="表示する予約"
          className="ios-segmented"
          style={{ '--ios-segment-count': FILTERS.length } as CSSProperties}
        >
          <span aria-hidden="true" className="ios-segmented-thumb" style={{ transform: `translateX(${filterIndex * 100}%)` }} />
          {FILTERS.map((f) => (
            <button key={f.value} type="button" aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}<small>{count(f.value)}</small>
            </button>
          ))}
        </div>

        <section className="ios-card mt-4" aria-label="今日と今月のまとめ">
          <div className="ios-summary-head">
            <strong>今日の予約 {todayBookings.length}件</strong>
            <span className="ios-footnote !text-[15px]">{todayLabel}</span>
          </div>
          <div className="ios-stats">
            <Link href="/trainer/sales" className="ios-stat">
              <p className="ios-stat-label">{monthLabel}の売上</p>
              <p className="ios-stat-value">{totalSales === null ? '—' : yen(totalSales)}</p>
            </Link>
            <Link href="/trainer/clients" className="ios-stat">
              <p className="ios-stat-label">お客様</p>
              <p className="ios-stat-value">{clientCount}<small>名</small></p>
            </Link>
            <Link href="/trainer/bookings" className="ios-stat">
              <p className="ios-stat-label">
                {pendingCount > 0 && <span aria-hidden="true" className="ios-dot" />}承認待ち
              </p>
              <p className={`ios-stat-value ${pendingCount > 0 ? 'text-warn' : ''}`}>{pendingCount}<small>件</small></p>
            </Link>
          </div>
          {salesError && <p role="status" className="ios-footnote px-4 pb-3">{salesError}</p>}
        </section>

        <h2 className="ios-section-title">
          <span>今日の予定</span>
          <Link href="/trainer/bookings">カレンダー</Link>
        </h2>

        {shown.length ? (
          <div key={filter} className="fitall-fade">
            {shown.map((booking) => {
              const meta = STATUS[booking.status] ?? { tag: '?', label: '状態確認中' }
              return (
                <Link key={booking.id} href="/trainer/bookings" className="ios-item" data-status={booking.status}>
                  <div className="ios-item-main">
                    <p className="ios-item-title">
                      <span className="ios-tag" data-status={booking.status}>{meta.tag}</span>
                      <span className="truncate">{booking.trainee_name}</span>
                      {booking.status === 'pending' && <span role="img" aria-label="要対応" className="ios-dot" />}
                    </p>
                    <p className="ios-item-meta">
                      <TicketIcon />
                      {booking.price ? `${yen(booking.price)} · チケット予約` : 'セッション'}
                    </p>
                  </div>
                  <div className="ios-item-side">
                    <p className="ios-item-time">{formatJstTime(booking.scheduled_at)}</p>
                    <p className={`ios-item-meta justify-end ${booking.status === 'pending' ? '!text-warn' : ''}`}>{meta.label}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="ios-card ios-empty">
            {todayBookings.length ? 'この条件の予約はありません' : '今日の予約はまだありません'}
          </div>
        )}

        <h2 className="ios-section-title">すぐにできること</h2>
        <div className="ios-list">
          <Link href="/trainer/invite" className="ios-list-row">
            <span className="ios-icon-tile bg-accent !text-ink"><SendIcon /></span>
            お客様に登録リンクを送る
            <ChevronIcon />
          </Link>
          <Link href="/trainer/availability" className="ios-list-row">
            <span className="ios-icon-tile bg-ink"><ClockIcon /></span>
            空き枠を設定する
            <ChevronIcon />
          </Link>
          <Link href="/trainer/settings" className="ios-list-row">
            <span className="ios-icon-tile bg-[#8E8E93]"><TicketIcon size={18} /></span>
            料金メニュー
            <ChevronIcon />
          </Link>
        </div>
      </div>
    </div>
  )
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.8 1.17V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-2.8-1.17l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3 14H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8.2l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 10 4.09V4a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 2.8 1.17l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 21 10h.09a2 2 0 1 1 0 4H21a1.65 1.65 0 0 0-1.6 1Z" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function TicketIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8a2 2 0 0 0 0 4 2 2 0 0 1 0 4v1a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1a2 2 0 0 1 0-4 2 2 0 0 0 0-4V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.5 2.5 2.8 10.2c-.8.3-.8 1.4 0 1.7l7 2.6 2.6 7c.3.8 1.4.8 1.7 0Z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="ios-chevron">
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}
