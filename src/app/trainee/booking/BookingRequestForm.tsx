'use client'

import { readTrainerSettingsFromBio } from '@/lib/trainer-settings'
import { useActionState, useMemo, useState } from 'react'
import { requestBookingAction, type BookingRequestState } from './actions'
import { BOOKING_CANCEL_DEADLINE_HOURS, getBookingOpenUntil } from '@/lib/booking-policy'

interface DayAvailability {
  slot_date: string
  start_time: string
  end_time: string
}

interface Props {
  availability: DayAvailability[]
  existingBookings: { id: string; scheduled_at: string; status: string; price: number }[]
  trainerBio?: string | null
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(
    2,
    '0'
  )}`
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

const ALL_TIME_SLOTS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

function normalizeTime(t: string): string {
  return t.slice(0, 5) // "10:00:00" -> "10:00"
}

export function BookingRequestForm({ availability, existingBookings, trainerBio }: Props) {
  const [state, action] = useActionState<BookingRequestState, FormData>(
    requestBookingAction,
    null
  )

  const [focusDate, setFocusDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const bookingOpenUntil = useMemo(() => getBookingOpenUntil(), [])
  const trainerSettings = useMemo(() => readTrainerSettingsFromBio(trainerBio), [trainerBio])

  const weekDates = useMemo(() => {
    const start = startOfWeek(focusDate)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [focusDate])

  const existingBookingMap = useMemo(() => {
    const m: Record<string, { status: string }> = {}
    for (const b of existingBookings) {
      if (!['pending', 'confirmed'].includes(b.status)) continue
      const d = new Date(b.scheduled_at)
      const key = `${toDateKey(d)} ${formatTime(d)}`
      m[key] = { status: b.status }
    }
    return m
  }, [existingBookings])

  function getAvailableSlotsForDate(date: Date): string[] {
    const baseBusinessSlots = ALL_TIME_SLOTS.filter(
      (t) => t >= trainerSettings.business_open && t < trainerSettings.business_close
    )
    if (availability.length === 0) return baseBusinessSlots
    const dateKey = toDateKey(date)
    const entry = availability.find((a) => a.slot_date === dateKey)
    if (!entry) return baseBusinessSlots
    const start = normalizeTime(entry.start_time)
    const end = normalizeTime(entry.end_time)
    return ALL_TIME_SLOTS.filter((t) => t >= start && t < end)
  }

  function isPastSlot(date: Date, time: string): boolean {
    const d = new Date(date)
    const [h, m] = time.split(':').map(Number)
    d.setHours(h ?? 0, m ?? 0, 0, 0)
    return d.getTime() < Date.now()
  }

  function isAfterBookingOpenUntil(date: Date, time: string): boolean {
    const d = new Date(date)
    const [h, m] = time.split(':').map(Number)
    d.setHours(h ?? 0, m ?? 0, 0, 0)
    return d.getTime() > bookingOpenUntil.getTime()
  }

  function moveWeek(offset: number) {
    setFocusDate((prev) => addDays(prev, 7 * offset))
  }

  // 成功時は完了メッセージのみ表示
  if (state && 'success' in state) {
    return (
      <div className="bg-white rounded-[20px] p-8 text-center border border-[#E5E7EB] shadow-[0px_1px_3px_rgba(0,0,0,0.04),0px_1px_2px_rgba(0,0,0,0.06)]">
        <p className="text-4xl mb-3">✅</p>
        <p className="text-base font-bold text-[#0A0A0A] mb-2">リクエストを送りました！</p>
        <p className="text-sm text-[#6B7280]">トレーナーの承認をお待ちください</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {state && 'error' in state && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[14px] px-4 py-3 text-sm text-[#EF4444]">
          {state.error}
        </div>
      )}

      <div className="bg-white rounded-[20px] p-4 border border-[#E5E7EB]">
        <p className="text-xs text-[#6B7280] mb-3">
          予約解放: {bookingOpenUntil.toLocaleDateString('ja-JP')} まで / キャンセル期限: {BOOKING_CANCEL_DEADLINE_HOURS}
          時間前まで
        </p>
        <p className="text-xs text-[#6B7280] mb-3">
          営業時間: {trainerSettings.business_open} - {trainerSettings.business_close} / 1セッション: {trainerSettings.session_duration_minutes}分
        </p>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#0A0A0A]">予約カレンダー（週）</h2>
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
              onClick={() => setFocusDate(new Date())}
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
          <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] text-[#166534] px-3 py-1 border border-[#BBF7D0]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
            予約可能
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] text-[#92400E] px-3 py-1 border border-[#FDE68A]">
            予約済み
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F8FAFC] text-[#64748B] px-3 py-1 border border-[#E2E8F0]">
            受付時間外
          </span>
        </div>

        <div className="border border-[#E5E7EB] rounded-[16px] overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-[72px_repeat(7,minmax(98px,1fr))]">
            <div className="h-12 border-b border-[#E5E7EB] bg-[#F9FAFB]" />
            {weekDates.map((d) => (
              <div
                key={toDateKey(d)}
                className="h-12 border-b border-l border-[#E5E7EB] bg-[#F9FAFB] flex flex-col items-center justify-center"
              >
                <p className="text-[11px] text-[#6B7280]">{WEEKDAYS[d.getDay()]}</p>
                <p className="text-sm font-bold text-[#0A0A0A]">{d.getDate()}</p>
              </div>
            ))}

            {ALL_TIME_SLOTS.map((time) => (
              <div key={`row-${time}`} className="contents">
                <div className="h-[58px] border-b border-[#E5E7EB] bg-[#F9FAFB] px-2">
                  <p className="text-xs text-[#6B7280] mt-2">{time}</p>
                </div>
                {weekDates.map((d) => {
                  const dateKey = toDateKey(d)
                  const key = `${dateKey} ${time}`
                  const available =
                    getAvailableSlotsForDate(d).includes(time) &&
                    !isPastSlot(d, time) &&
                    !isAfterBookingOpenUntil(d, time)
                  const booked = !!existingBookingMap[key]
                  const selected = selectedDate === dateKey && selectedTime === time

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!available || booked}
                      onClick={() => {
                        setSelectedDate(dateKey)
                        setSelectedTime(time)
                      }}
                      className={`h-[58px] border-b border-l border-[#E5E7EB] text-xs font-semibold transition-colors ${
                        selected
                          ? 'bg-[#0066FF] text-white'
                          : booked
                          ? 'bg-[#FEF3C7] text-[#92400E]'
                          : available
                          ? 'bg-[#ECFDF5] text-[#166534]'
                          : 'bg-[#F8FAFC] text-[#9CA3AF]'
                      }`}
                    >
                      {booked ? '予約済' : available ? '○' : '—'}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 送信ボタン */}
      {selectedDate && selectedTime && (
        <form action={action}>
          <input type="hidden" name="date" value={selectedDate} />
          <input type="hidden" name="time" value={selectedTime} />
          <div className="bg-white rounded-[20px] p-4 border border-[#E5E7EB] shadow-[0px_1px_3px_rgba(0,0,0,0.04),0px_1px_2px_rgba(0,0,0,0.06)]">
            <p className="text-sm text-[#6B7280] mb-3 text-center">
              {new Date(selectedDate).toLocaleDateString('ja-JP', {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })} {selectedTime}
            </p>
            <button
              type="submit"
              className="w-full h-14 bg-[#0066FF] text-white text-sm font-bold rounded-full active:scale-[0.97] transition-transform"
            >
              リクエストを送る
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
