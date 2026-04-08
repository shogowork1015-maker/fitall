'use client'

import { useMemo, useState } from 'react'
import { BookingActions } from './BookingActions'

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

interface BookingItem {
  id: string
  scheduled_at: string
  trainee_id: string
  trainee_name: string
  price: number
  status: BookingStatus
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8) // 08:00 - 22:00

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function statusBadgeClass(status: BookingStatus): string {
  if (status === 'pending') return 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
  if (status === 'confirmed') return 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]'
  if (status === 'completed') return 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]'
  return 'bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]'
}

function statusLabel(status: BookingStatus): string {
  if (status === 'pending') return '承認待ち'
  if (status === 'confirmed') return '確定'
  if (status === 'completed') return '完了'
  return 'キャンセル'
}

export function TrainerBookingCalendar({ bookings }: { bookings: BookingItem[] }) {
  const [focusDate, setFocusDate] = useState<Date>(new Date())
  const [selectedDateKey, setSelectedDateKey] = useState<string>(toDateKey(new Date()))

  const weekDates = useMemo(() => {
    const start = startOfWeek(focusDate)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [focusDate])

  const bookingsByDate = useMemo(() => {
    const map: Record<string, BookingItem[]> = {}
    for (const b of bookings) {
      const key = toDateKey(new Date(b.scheduled_at))
      if (!map[key]) map[key] = []
      map[key]!.push(b)
    }
    for (const key of Object.keys(map)) {
      map[key]!.sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      )
    }
    return map
  }, [bookings])

  const selectedBookings = bookingsByDate[selectedDateKey] ?? []

  function moveWeek(offset: number) {
    setFocusDate((prev) => addDays(prev, 7 * offset))
  }

  function goToday() {
    const now = new Date()
    setFocusDate(now)
    setSelectedDateKey(toDateKey(now))
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-[20px] p-4 border border-[#E5E7EB]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">週表示</p>
            <p className="text-lg font-bold text-[#0A0A0A]">
              {weekDates[0]!.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })} -{' '}
              {weekDates[6]!.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => moveWeek(-1)}
              className="w-11 h-11 rounded-full border border-[#E5E7EB] text-[#0A0A0A] text-lg font-bold"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goToday}
              className="h-11 px-4 rounded-full border border-[#E5E7EB] text-sm font-semibold text-[#0A0A0A]"
            >
              今週
            </button>
            <button
              type="button"
              onClick={() => moveWeek(1)}
              className="w-11 h-11 rounded-full border border-[#E5E7EB] text-[#0A0A0A] text-lg font-bold"
            >
              ›
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3 text-xs font-semibold">
          <span className="inline-flex items-center rounded-full px-3 py-1 bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
            承認待ち
          </span>
          <span className="inline-flex items-center rounded-full px-3 py-1 bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
            確定
          </span>
          <span className="inline-flex items-center rounded-full px-3 py-1 bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
            完了
          </span>
        </div>

        <div className="border border-[#E5E7EB] rounded-[16px] overflow-x-auto">
          <div className="grid min-w-[860px] grid-cols-[72px_repeat(7,minmax(112px,1fr))]">
            <div className="h-12 border-b border-[#E5E7EB] bg-[#F9FAFB]" />
            {weekDates.map((d) => {
              const key = toDateKey(d)
              const isSelected = selectedDateKey === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDateKey(key)}
                  className={`h-12 border-b border-l border-[#E5E7EB] flex flex-col items-center justify-center ${
                    isSelected ? 'bg-[#EFF6FF]' : 'bg-[#F9FAFB]'
                  }`}
                >
                  <p className="text-[11px] text-[#6B7280]">{WEEKDAYS[d.getDay()]}</p>
                  <p className="text-sm font-bold text-[#0A0A0A]">{d.getDate()}</p>
                </button>
              )
            })}

            {HOURS.map((hour) => (
              <div key={`row-${hour}`} className="contents">
                <div className="h-[62px] border-b border-[#E5E7EB] bg-[#F9FAFB] px-2">
                  <p className="text-xs text-[#6B7280] mt-2">{String(hour).padStart(2, '0')}:00</p>
                </div>
                {weekDates.map((d) => {
                  const dateKey = toDateKey(d)
                  const cellBookings = (bookingsByDate[dateKey] ?? []).filter(
                    (b) => new Date(b.scheduled_at).getHours() === hour
                  )
                  return (
                    <button
                      key={`${dateKey}-${hour}`}
                      type="button"
                      onClick={() => setSelectedDateKey(dateKey)}
                      className="h-[62px] px-1.5 py-1 border-b border-l border-[#E5E7EB] bg-white text-left"
                    >
                      <div className="space-y-1">
                        {cellBookings.slice(0, 1).map((b) => (
                          <div
                            key={b.id}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate ${statusBadgeClass(
                              b.status
                            )}`}
                          >
                            {new Date(b.scheduled_at).toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            {b.trainee_name}
                          </div>
                        ))}
                        {cellBookings.length > 1 && (
                          <p className="text-[10px] text-[#6B7280]">+{cellBookings.length - 1}件</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-bold text-[#0A0A0A]">
          {new Date(selectedDateKey).toLocaleDateString('ja-JP', {
            month: 'long',
            day: 'numeric',
            weekday: 'short',
          })}
          の予約
        </h2>

        {!selectedBookings.length ? (
          <div className="bg-white rounded-[20px] p-6 text-center text-sm text-[#9CA3AF] border border-[#E5E7EB]">
            予約はありません
          </div>
        ) : (
          <div className="space-y-3">
            {selectedBookings.map((b) => (
              <div
                key={b.id}
                className={`bg-white rounded-[20px] p-4 border ${statusBadgeClass(b.status)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-[#0A0A0A]">{b.trainee_name}</p>
                    <p className="text-sm text-[#6B7280] mt-0.5">
                      {new Date(b.scheduled_at).toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · ¥{b.price.toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${statusBadgeClass(b.status)}`}>
                    {statusLabel(b.status)}
                  </span>
                </div>
                <BookingActions bookingId={b.id} status={b.status} scheduledAt={b.scheduled_at} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
