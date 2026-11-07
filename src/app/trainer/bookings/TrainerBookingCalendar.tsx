'use client'

import { useMemo, useState } from 'react'
import { BookingActions } from './BookingActions'
import { MoveBookingForm } from './MoveBookingForm'
import { QuickReservationModal } from './QuickReservationModal'

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'
type ViewMode = 'day' | 'week' | 'month'

interface BookingItem {
  id: string
  scheduled_at: string
  trainee_id: string
  trainee_name: string
  price: number
  status: BookingStatus
  credit_status?: string | null
}

interface ClientOption {
  trainee_id: string
  name: string
}

interface MenuOption {
  id: string
  name: string
  price: number
}

interface Props {
  bookings: BookingItem[]
  clients: ClientOption[]
  menus: MenuOption[]
  preview?: boolean
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7)

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

function timeFromDate(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function timeFromHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

function startTimeLabel(value: string): string {
  return new Date(value).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

const statusBadge: Record<BookingStatus, string> = {
  pending: 'bg-white text-[#0A0A0A] border border-[#0A0A0A]',
  confirmed: 'bg-[#12C7BE] text-white',
  completed: 'bg-[#0A0A0A] text-white',
  cancelled: 'bg-[#E8EEEE] text-[#555555]',
}

function statusLabel(status: BookingStatus): string {
  if (status === 'pending') return '承認待ち'
  if (status === 'confirmed') return '確定'
  if (status === 'completed') return '完了'
  return 'キャンセル'
}

function viewTitle(view: ViewMode) {
  if (view === 'day') return '1日'
  if (view === 'week') return '週'
  return '月'
}

export function TrainerBookingCalendar({ bookings, clients, menus, preview = false }: Props) {
  const [view, setView] = useState<ViewMode>('week')
  const [focusDate, setFocusDate] = useState<Date>(new Date())
  const [selectedDateKey, setSelectedDateKey] = useState<string>(toDateKey(new Date()))
  const [modalSlot, setModalSlot] = useState<{ dateKey: string; startTime: string } | null>(null)

  const weekDates = useMemo(() => {
    const start = startOfWeek(focusDate)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [focusDate])

  const monthDates = useMemo(() => {
    const first = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1)
    const gridStart = startOfWeek(first)
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  }, [focusDate])

  const bookingsByDate = useMemo(() => {
    const map: Record<string, BookingItem[]> = {}
    for (const booking of bookings) {
      const key = toDateKey(new Date(booking.scheduled_at))
      if (!map[key]) map[key] = []
      map[key]!.push(booking)
    }
    for (const key of Object.keys(map)) {
      map[key]!.sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      )
    }
    return map
  }, [bookings])

  const selectedBookings = bookingsByDate[selectedDateKey] ?? []

  function move(direction: -1 | 1) {
    if (view === 'day') setFocusDate((prev) => addDays(prev, direction))
    if (view === 'week') setFocusDate((prev) => addDays(prev, direction * 7))
    if (view === 'month') {
      setFocusDate(
        (prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, Math.min(prev.getDate(), 28))
      )
    }
  }

  function goToday() {
    const now = new Date()
    setFocusDate(now)
    setSelectedDateKey(toDateKey(now))
  }

  function openReservation(date: Date, hour?: number) {
    const dateKey = toDateKey(date)
    setSelectedDateKey(dateKey)
    setFocusDate(date)
    setModalSlot({
      dateKey,
      startTime: typeof hour === 'number' ? timeFromHour(hour) : timeFromDate(date),
    })
  }

  function title() {
    if (view === 'day') {
      return focusDate.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      })
    }
    if (view === 'week') {
      return `${weekDates[0]!.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })} - ${weekDates[6]!.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}`
    }
    return focusDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
  }

  function renderMonthView() {
    const currentMonth = focusDate.getMonth()
    return (
      <div className="overflow-hidden rounded-[10px] border-2 border-[#DDE8E8] bg-white">
        <div className="grid grid-cols-7 bg-[#0A0A0A]">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="flex h-10 items-center justify-center border-b border-white/20 text-xs font-bold text-white"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {monthDates.map((date) => {
            const key = toDateKey(date)
            const dayBookings = bookingsByDate[key] ?? []
            const isSelected = selectedDateKey === key
            const isToday = key === toDateKey(new Date())
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedDateKey(key)
                  setFocusDate(date)
                }}
                onDoubleClick={() => openReservation(date, 10)}
                className={`min-h-[116px] border-b border-r border-[#DDE8E8] p-2 text-left align-top ${
                  isSelected ? 'bg-[#E8FBFA]' : 'bg-white'
                } ${date.getMonth() === currentMonth ? 'text-[#0A0A0A]' : 'text-[#CBD5E1]'}`}
              >
                <div className="mb-1 flex items-center justify-between gap-1">
                  <span
                    className={`flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-black ${
                      isToday ? 'bg-[#12C7BE] px-1.5 text-white' : ''
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  <span className="text-[10px] font-black text-[#12C7BE]">+</span>
                </div>
                <div className="space-y-1">
                  {dayBookings.slice(0, 3).map((booking) => (
                    <div
                      key={booking.id}
                      className={`truncate rounded-[5px] px-2 py-1 text-[11px] font-black leading-tight ${statusBadge[booking.status]}`}
                    >
                      {startTimeLabel(booking.scheduled_at)} {booking.trainee_name}
                    </div>
                  ))}
                  {dayBookings.length > 3 && (
                    <p className="text-[10px] font-bold text-[#64748B]">+{dayBookings.length - 3}件</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function renderGrid(mode: 'week' | 'day') {
    const dates = mode === 'day' ? [focusDate] : weekDates
    return (
      <div className="w-full max-w-full overflow-x-auto rounded-[10px] border-2 border-[#DDE8E8] bg-white">
        <div
          className={`grid min-w-[820px] ${
            mode === 'day'
              ? 'grid-cols-[70px_minmax(420px,1fr)]'
              : 'grid-cols-[70px_repeat(7,minmax(140px,1fr))]'
          }`}
        >
          <div className="h-12 border-b border-[#DDE8E8] bg-[#0A0A0A]" />
          {dates.map((date) => {
            const key = toDateKey(date)
            const isSelected = selectedDateKey === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDateKey(key)}
                className={`h-12 border-b border-l border-[#DDE8E8] ${
                  isSelected ? 'bg-[#12C7BE]' : 'bg-[#0A0A0A]'
                }`}
              >
                <p className="text-[10px] font-bold text-white/70">{WEEKDAYS[date.getDay()]}</p>
                <p className="text-sm font-black text-white">
                  {date.getMonth() + 1}/{date.getDate()}
                </p>
              </button>
            )
          })}

          {HOURS.map((hour) => (
            <div key={`row-${hour}`} className="contents">
              <div className="h-[76px] border-b border-[#DDE8E8] bg-white px-2">
                <p className="mt-2 text-[10px] font-black text-[#555555]">{timeFromHour(hour)}</p>
              </div>
              {dates.map((date) => {
                const key = toDateKey(date)
                const hourBookings = (bookingsByDate[key] ?? []).filter(
                  (booking) => new Date(booking.scheduled_at).getHours() === hour
                )
                return (
                  <button
                    key={`${key}-${hour}`}
                    type="button"
                    onClick={() => openReservation(date, hour)}
                    className="group h-[76px] border-b border-l border-[#DDE8E8] bg-white px-2 py-1.5 text-left transition-colors hover:bg-[#E8FBFA]"
                  >
                    <div className="space-y-1">
                      {hourBookings.slice(0, 2).map((booking) => (
                        <div
                          key={booking.id}
                          className={`truncate rounded-[5px] px-2 py-1.5 text-[12px] font-black leading-tight ${statusBadge[booking.status]}`}
                        >
                          {startTimeLabel(booking.scheduled_at)} {booking.trainee_name}
                        </div>
                      ))}
                      {!hourBookings.length && (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#DDE8E8] bg-white text-[13px] font-black text-[#12C7BE]">
                          ＋
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-5 overflow-hidden">
      <div className="fitall-card-strong fitall-card-pop overflow-hidden">
        <div className="bg-[#12C7BE] px-4 py-3 text-white">
          <p className="text-[10px] font-black tracking-[0.12em] text-white/80">CALENDAR</p>
          <h2 className="mt-1 text-lg font-black">{title()}</h2>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => openReservation(focusDate, 10)}
              className="fitall-primary-action fitall-tap col-span-2 h-11 text-xs"
            >
              予約を入れる
            </button>
            <button
              type="button"
              onClick={goToday}
              className="fitall-secondary-action fitall-tap h-11 text-xs"
            >
              今日
            </button>
          </div>
        </div>
      </div>

      <div className="fitall-card rounded-[6px] p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#087D78]">
              {viewTitle(view)}表示
            </p>
            <h2 className="mt-1 text-sm font-black text-[#0A0A0A]">表示を切り替え</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={`h-10 rounded-[8px] px-3 text-xs font-black ${
                  view === mode
                    ? 'bg-[#0A0A0A] text-white'
                    : 'border border-[#DDE8E8] bg-white text-[#555555]'
                }`}
              >
                {viewTitle(mode)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => move(-1)}
              className="h-10 w-10 rounded-[8px] border border-[#DDE8E8] text-lg font-bold text-[#0A0A0A]"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              className="h-10 w-10 rounded-[8px] border border-[#DDE8E8] text-lg font-bold text-[#0A0A0A]"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] font-black">
        <span className="rounded-[6px] bg-[#12C7BE] px-3 py-1 text-white">確定</span>
        <span className="rounded-[6px] border border-[#0A0A0A] bg-white px-3 py-1 text-[#0A0A0A]">承認待ち</span>
        <span className="rounded-[6px] bg-[#0A0A0A] px-3 py-1 text-white">完了</span>
        <span className="rounded-[6px] border border-[#DDE8E8] px-3 py-1 text-[#555555]">
          ＋をタップして予約
        </span>
        {preview && (
          <span className="rounded-[6px] bg-[#E8FBFA] px-3 py-1 text-[#087D78]">
            UI確認モード
          </span>
        )}
      </div>

      {view === 'month' ? renderMonthView() : renderGrid(view)}

      <div>
        <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-wide text-[#666666]">
          {new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString('ja-JP', {
            month: 'long',
            day: 'numeric',
            weekday: 'short',
          })}
          の予約
        </h2>

        {!selectedBookings.length ? (
          <div className="rounded-[10px] border-2 border-dashed border-[#DDE8E8] bg-white p-6 text-center text-sm font-bold text-[#555555]">
            空きセルの＋から予約を入れられます
          </div>
        ) : (
          <div className="space-y-3">
            {selectedBookings.map((booking) => (
              <div
                key={booking.id}
                className="fitall-card-pop relative overflow-hidden rounded-[10px] border-2 border-[#DDE8E8] bg-white p-4"
              >
                <div
                  className={`absolute bottom-0 left-0 top-0 w-1 ${
                    booking.status === 'pending'
                      ? 'bg-[#0A0A0A]'
                      : booking.status === 'confirmed'
                        ? 'bg-[#12C7BE]'
                        : booking.status === 'completed'
                          ? 'bg-[#0A0A0A]'
                          : 'bg-gray-300'
                  }`}
                />
                <div className="ml-1 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-black text-[#0A0A0A]">{booking.trainee_name}</p>
                    <p className="mt-0.5 text-sm font-semibold text-gray-500">
                      {startTimeLabel(booking.scheduled_at)} · ¥{booking.price.toLocaleString()}
                    </p>
                  </div>
                  <span className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${statusBadge[booking.status]}`}>
                    {statusLabel(booking.status)}
                  </span>
                </div>
                {booking.credit_status && (
                  <div className="ml-1 mt-2">
                    <span className="inline-flex rounded-md bg-[#EFF6FF] px-2.5 py-1 text-[11px] font-bold text-[#1D4ED8]">
                      チケット予約
                    </span>
                  </div>
                )}
                <div className="ml-1 mt-3">
                  {preview ? (
                    <div className="rounded-[12px] border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2 text-xs font-bold text-[#64748B]">
                      プレビュー中のため、承認・完了・移動は保存されません
                    </div>
                  ) : (
                    <>
                      <BookingActions
                        bookingId={booking.id}
                        status={booking.status}
                        scheduledAt={booking.scheduled_at}
                      />
                      <MoveBookingForm
                        bookingId={booking.id}
                        scheduledAt={booking.scheduled_at}
                        disabled={booking.status === 'completed' || booking.status === 'cancelled'}
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalSlot && (
        <QuickReservationModal
          open
          dateKey={modalSlot.dateKey}
          startTime={modalSlot.startTime}
          clients={clients}
          menus={menus}
          preview={preview}
          onClose={() => setModalSlot(null)}
        />
      )}
    </div>
  )
}
