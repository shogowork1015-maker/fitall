'use client'

import { useMemo, useState } from 'react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
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
  pending: 'bg-white text-ink border border-ink',
  confirmed: 'bg-accent text-ink',
  completed: 'bg-ink text-white',
  cancelled: 'bg-surface-soft text-ink-muted',
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
  const [direction, setDirection] = useState<-1 | 0 | 1>(0)
  const todayKey = toDateKey(new Date())

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

  // 日付を選ぶと一覧も同じ日に揃える
  function selectDate(date: Date) {
    setSelectedDateKey(toDateKey(date))
    setFocusDate(date)
  }

  function move(step: -1 | 1) {
    const next =
      view === 'day'
        ? addDays(focusDate, step)
        : view === 'week'
          ? addDays(focusDate, step * 7)
          : new Date(focusDate.getFullYear(), focusDate.getMonth() + step, Math.min(focusDate.getDate(), 28))
    setDirection(step)
    selectDate(next)
  }

  function goToday() {
    const now = new Date()
    setDirection(now.getTime() < focusDate.getTime() ? -1 : 1)
    selectDate(now)
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

  function renderBookingChips(dayBookings: BookingItem[], max: number) {
    return (
      <>
        {dayBookings.slice(0, max).map((booking) => (
          <div key={booking.id} className={`truncate rounded-chip px-2 py-1 leading-tight font-bold ${statusBadge[booking.status]}`}>
            {startTimeLabel(booking.scheduled_at)} {booking.trainee_name}
          </div>
        ))}
      </>
    )
  }

  // スマホの週表示: 7日を1画面に収め、選んだ日の予約を下の一覧で見る
  function renderWeekStrip() {
    return (
      <div role="group" aria-label="表示する日" className="grid grid-cols-7 gap-1 md:hidden">
        {weekDates.map((date) => {
          const key = toDateKey(date)
          const count = bookingsByDate[key]?.length ?? 0
          const selected = selectedDateKey === key
          const today = key === todayKey
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              aria-label={`${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS[date.getDay()]}曜日 予約${count}件`}
              onClick={() => selectDate(date)}
              className={`flex h-[84px] flex-col items-center justify-center gap-0.5 rounded-control border ${
                selected ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink'
              }`}
            >
              <span className={selected ? 'text-white/80' : 'text-ink-muted'}>{WEEKDAYS[date.getDay()]}</span>
              <span className={`text-lg font-black leading-none ${today && !selected ? 'text-brand' : ''}`}>{date.getDate()}</span>
              <span aria-hidden="true" className={`mt-1 h-1.5 w-1.5 rounded-full ${count ? 'bg-accent' : 'bg-transparent'}`} />
            </button>
          )
        })}
      </div>
    )
  }

  function renderMonthView() {
    const currentMonth = focusDate.getMonth()
    return (
      <div className="overflow-hidden rounded-card border border-line bg-white">
        <div className="grid grid-cols-7 bg-ink">
          {WEEKDAYS.map((day) => (
            <div key={day} className="flex h-10 items-center justify-center font-bold text-white">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {monthDates.map((date) => {
            const key = toDateKey(date)
            const dayBookings = bookingsByDate[key] ?? []
            const isSelected = selectedDateKey === key
            const isToday = key === todayKey
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${date.getMonth() + 1}月${date.getDate()}日 予約${dayBookings.length}件`}
                onClick={() => selectDate(date)}
                onDoubleClick={() => openReservation(date, 10)}
                className={`flex min-h-[64px] flex-col items-center gap-1 border-b border-r border-line p-1 md:min-h-[116px] md:items-stretch md:p-2 md:text-left ${
                  isSelected ? 'bg-accent-soft' : 'bg-white'
                } ${date.getMonth() === currentMonth ? 'text-ink' : 'text-ink-faint'}`}
              >
                <span className={`flex h-7 min-w-7 items-center justify-center self-center rounded-full font-bold md:self-start ${isToday ? 'bg-accent px-1 text-ink' : ''}`}>
                  {date.getDate()}
                </span>
                {dayBookings.length > 0 && (
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand md:hidden" />
                )}
                <div className="hidden space-y-1 md:block">
                  {renderBookingChips(dayBookings, 3)}
                  {dayBookings.length > 3 && <p className="font-medium text-ink-muted">+{dayBookings.length - 3}件</p>}
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
      <div className={`${mode === 'week' ? 'hidden md:block' : ''} w-full max-w-full overflow-x-auto rounded-card border border-line bg-white`}>
        <div className={`grid ${mode === 'day' ? 'grid-cols-[72px_minmax(0,1fr)]' : 'min-w-[900px] grid-cols-[72px_repeat(7,minmax(0,1fr))]'}`}>
          <div className="h-14 border-b border-line bg-ink" />
          {dates.map((date) => {
            const key = toDateKey(date)
            const isSelected = selectedDateKey === key
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => selectDate(date)}
                className={`flex h-14 items-center justify-center gap-2 border-b border-l border-line font-bold ${
                  isSelected ? 'bg-accent text-ink' : 'bg-ink text-white'
                }`}
              >
                <span>{date.getMonth() + 1}/{date.getDate()}</span>
                <span className="font-medium">{WEEKDAYS[date.getDay()]}</span>
              </button>
            )
          })}

          {HOURS.map((hour) => (
            <div key={`row-${hour}`} className="contents">
              <div className="h-[76px] border-b border-line bg-white px-2 pt-2 font-medium text-ink-muted">
                {timeFromHour(hour)}
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
                    aria-label={`${date.getMonth() + 1}月${date.getDate()}日 ${timeFromHour(hour)}に予約を入れる`}
                    onClick={() => openReservation(date, hour)}
                    className="group h-[76px] border-b border-l border-line bg-white px-2 py-1.5 text-left hover:bg-accent-soft"
                  >
                    <div className="space-y-1">
                      {renderBookingChips(hourBookings, 2)}
                      {!hourBookings.length && (
                        <span aria-hidden="true" className="text-xl font-bold text-ink-faint opacity-0 transition-opacity group-hover:opacity-100">＋</span>
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

  const slideClass = direction > 0 ? 'fitall-slide-next' : direction < 0 ? 'fitall-slide-prev' : 'fitall-fade'

  return (
    <div className="min-w-0 space-y-4 pb-20 md:pb-0">
      <div className="fitall-card space-y-3 p-3">
        <div className="flex items-center gap-2">
          <button type="button" aria-label={`前の${viewTitle(view)}`} onClick={() => move(-1)} className="fitall-icon-button">‹</button>
          <h2 aria-live="polite" className="min-w-0 flex-1 text-center text-lg font-black leading-tight text-ink">{title()}</h2>
          <button type="button" aria-label={`次の${viewTitle(view)}`} onClick={() => move(1)} className="fitall-icon-button">›</button>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <SegmentedControl
            label="カレンダーの表示"
            value={view}
            onChange={(next) => { setDirection(0); setView(next) }}
            options={(['day', 'week', 'month'] as ViewMode[]).map((mode) => ({ value: mode, label: viewTitle(mode) }))}
          />
          <button type="button" onClick={goToday} className="fitall-secondary-action">今日</button>
        </div>
        <button type="button" onClick={() => openReservation(focusDate, 10)} className="fitall-primary-action hidden md:inline-flex">
          予約を入れる
        </button>
      </div>

      <div className="hidden flex-wrap items-center gap-2 font-bold md:flex">
        <span className="rounded-chip bg-accent px-3 py-1 text-ink">確定</span>
        <span className="rounded-chip border border-ink bg-white px-3 py-1 text-ink">承認待ち</span>
        <span className="rounded-chip bg-ink px-3 py-1 text-white">完了</span>
      </div>

      <div key={`${view}-${title()}`} className={slideClass}>
        {view === 'month' ? renderMonthView() : (
          <div className="space-y-3">
            {view === 'week' && renderWeekStrip()}
            {renderGrid(view)}
          </div>
        )}
      </div>

      <section aria-label="選択した日の予約">
        <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
          <h2 className="font-bold text-ink">
            {new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString('ja-JP', {
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}
          </h2>
          <span className="font-medium text-ink-muted">{selectedBookings.length}件</span>
        </div>

        {!selectedBookings.length ? (
          <div key={selectedDateKey} className="fitall-fade rounded-card border border-dashed border-line bg-white p-5 text-center">
            <p className="font-medium text-ink-muted">この日の予約はありません</p>
            <button
              type="button"
              onClick={() => openReservation(new Date(`${selectedDateKey}T00:00:00`), 10)}
              className="fitall-secondary-action mt-3 w-full"
            >
              この日に予約を入れる
            </button>
          </div>
        ) : (
          <div key={selectedDateKey} className="space-y-3">
            {selectedBookings.map((booking, index) => (
              <div
                key={booking.id}
                className="fitall-card fitall-card-pop relative overflow-hidden p-4"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div
                  aria-hidden="true"
                  className={`absolute bottom-0 left-0 top-0 w-1 ${
                    booking.status === 'confirmed' ? 'bg-accent' : booking.status === 'cancelled' ? 'bg-line' : 'bg-ink'
                  }`}
                />
                <div className="ml-1 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black leading-tight text-ink">{startTimeLabel(booking.scheduled_at)} {booking.trainee_name}</p>
                    <p className="mt-1 font-medium text-ink-muted">
                      ¥{booking.price.toLocaleString()}{booking.credit_status ? ' · チケット予約' : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-chip px-2.5 py-1 font-bold ${statusBadge[booking.status]}`}>
                    {statusLabel(booking.status)}
                  </span>
                </div>
                <div className="ml-1 mt-3">
                  {preview ? (
                    <div className="rounded-control bg-surface-soft px-3 py-2 font-medium text-ink-muted">
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
      </section>

      <button
        type="button"
        aria-label="予約を入れる"
        onClick={() => openReservation(new Date(`${selectedDateKey}T00:00:00`), 10)}
        className="fitall-fab"
      >
        ＋
      </button>

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
