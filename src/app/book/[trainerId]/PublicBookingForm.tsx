'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { SubmitButton } from '@/components/SubmitButton'
import { createPublicBookingCheckoutAction, type PublicBookingState } from './actions'
import type { PublicBookingData, PublicBookingSlot } from '@/lib/public-booking'

const SLOT_ROW_STEP_MINUTES = 60
const DEFAULT_CALENDAR_START_MINUTES = 9 * 60
const DEFAULT_CALENDAR_END_MINUTES = 21 * 60
type CalendarView = 'week' | 'month'

interface WeekDay {
  date: Date
  dateKey: string
  dateLabel: string
  weekday: string
}

interface MonthDay extends WeekDay {
  inCurrentMonth: boolean
}

function toDateKey(value: string) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function dateFromKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(date: Date, months: number) {
  return startOfDay(new Date(date.getFullYear(), date.getMonth() + months, 1))
}

function startOfWeek(date: Date) {
  const next = startOfDay(date)
  const dayIndexFromMonday = (next.getDay() + 6) % 7
  return addDays(next, -dayIndexFromMonday)
}

function startOfMonth(date: Date) {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1))
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
}

function minutesToTime(minutes: number) {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function slotTimeMinutes(value: string) {
  const date = new Date(value)
  return date.getHours() * 60 + date.getMinutes()
}

function slotKey(value: string) {
  return `${toDateKey(value)}-${minutesToTime(slotTimeMinutes(value))}`
}

function slotHourKey(value: string) {
  const minutes = slotTimeMinutes(value)
  return `${toDateKey(value)}-${String(Math.floor(minutes / 60)).padStart(2, '0')}`
}

function buildWeekDays(weekStart: Date): WeekDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index)
    return {
      date,
      dateKey: toDateKey(date.toISOString()),
      dateLabel: date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
      weekday: date.toLocaleDateString('ja-JP', { weekday: 'short' }),
    }
  })
}

function buildMonthDays(monthDate: Date): MonthDay[] {
  const monthStart = startOfMonth(monthDate)
  const gridStart = startOfWeek(monthStart)

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index)
    return {
      date,
      dateKey: toDateKey(date.toISOString()),
      dateLabel: date.toLocaleDateString('ja-JP', { day: 'numeric' }),
      weekday: date.toLocaleDateString('ja-JP', { weekday: 'short' }),
      inCurrentMonth: date.getMonth() === monthStart.getMonth(),
    }
  })
}

function formatSelectedSlot(value: string) {
  if (!value) return 'まだ選択されていません'
  return new Date(value).toLocaleString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PublicBookingForm({ data }: { data: PublicBookingData }) {
  const [state, action] = useActionState<PublicBookingState, FormData>(
    createPublicBookingCheckoutAction,
    null
  )
  const initialDateKey = toDateKey(data.slots[0]?.value ?? new Date().toISOString())
  const [selectedMenuId, setSelectedMenuId] = useState(data.menus[0]?.id ?? '')
  const [selectedSlot, setSelectedSlot] = useState(data.slots[0]?.value ?? '')
  const [selectedDateKey, setSelectedDateKey] = useState(initialDateKey)
  const [calendarView, setCalendarView] = useState<CalendarView>('week')
  const [monthAnchorDate, setMonthAnchorDate] = useState(() =>
    startOfMonth(dateFromKey(initialDateKey))
  )
  const selectedDate = useMemo(() => dateFromKey(selectedDateKey), [selectedDateKey])
  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate])
  const weekDays = useMemo(() => buildWeekDays(weekStart), [weekStart])
  const monthDays = useMemo(() => buildMonthDays(monthAnchorDate), [monthAnchorDate])
  const slotMap = useMemo(() => {
    const map = new Map<string, PublicBookingSlot>()
    for (const slot of data.slots) {
      map.set(slotKey(slot.value), slot)
      if (!map.has(slotHourKey(slot.value))) {
        map.set(slotHourKey(slot.value), slot)
      }
    }
    return map
  }, [data.slots])
  const slotsByDate = useMemo(() => {
    const map = new Map<string, PublicBookingSlot[]>()
    for (const slot of data.slots) {
      const key = toDateKey(slot.value)
      map.set(key, [...(map.get(key) ?? []), slot])
    }
    return map
  }, [data.slots])
  const slotCountsByDate = useMemo(() => {
    const map = new Map<string, number>()
    for (const slot of data.slots) {
      const key = toDateKey(slot.value)
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [data.slots])
  const timeBounds = useMemo(() => {
    if (data.slots.length === 0) {
      return {
        start: DEFAULT_CALENDAR_START_MINUTES,
        end: DEFAULT_CALENDAR_END_MINUTES,
      }
    }

    const slotMinutes = data.slots.map((slot) => slotTimeMinutes(slot.value))
    const first = Math.floor(Math.min(...slotMinutes) / SLOT_ROW_STEP_MINUTES) * SLOT_ROW_STEP_MINUTES
    const last =
      Math.ceil((Math.max(...slotMinutes) + SLOT_ROW_STEP_MINUTES) / SLOT_ROW_STEP_MINUTES) *
      SLOT_ROW_STEP_MINUTES

    return {
      start: Math.min(DEFAULT_CALENDAR_START_MINUTES, first),
      end: Math.max(DEFAULT_CALENDAR_END_MINUTES, last),
    }
  }, [data.slots])
  const timeRows = useMemo(
    () =>
      Array.from(
        { length: Math.ceil((timeBounds.end - timeBounds.start) / SLOT_ROW_STEP_MINUTES) },
        (_, index) => timeBounds.start + index * SLOT_ROW_STEP_MINUTES
      ),
    [timeBounds]
  )
  const visibleSlotValues = useMemo(() => {
    const visibleDateKeys = new Set(
      calendarView === 'week' ? weekDays.map((day) => day.dateKey) : [selectedDateKey]
    )
    return data.slots
      .filter((slot) => visibleDateKeys.has(toDateKey(slot.value)))
      .map((slot) => slot.value)
  }, [calendarView, data.slots, selectedDateKey, weekDays])
  const today = startOfDay(new Date())
  const firstMonth = startOfMonth(today)
  const lastSlotDate = data.slots.at(-1)?.value
    ? startOfDay(new Date(data.slots.at(-1)!.value))
    : today
  const lastMonth = startOfMonth(lastSlotDate)
  const periodLabel =
    calendarView === 'week'
      ? `${weekDays[0]?.dateLabel} - ${weekDays[6]?.dateLabel}`
      : formatMonthLabel(monthAnchorDate)
  const isPreviousDisabled =
    calendarView === 'week'
      ? weekStart.getTime() <= startOfWeek(today).getTime()
      : startOfMonth(monthAnchorDate).getTime() <= firstMonth.getTime()
  const isNextDisabled =
    calendarView === 'week'
      ? addDays(weekStart, 7).getTime() > lastSlotDate.getTime()
      : addMonths(monthAnchorDate, 1).getTime() > lastMonth.getTime()

  useEffect(() => {
    if (state && 'checkoutUrl' in state) {
      window.location.href = state.checkoutUrl
    }
  }, [state])

  const hasSlots = data.slots.length > 0
  const hasMenus = data.menus.length > 0
  const effectiveSelectedSlot = visibleSlotValues.includes(selectedSlot)
    ? selectedSlot
    : visibleSlotValues[0] ?? ''
  const selectDate = (dateKey: string) => {
    setSelectedDateKey(dateKey)
    setSelectedSlot(slotsByDate.get(dateKey)?.[0]?.value ?? '')
  }
  const movePeriod = (direction: -1 | 1) => {
    if (calendarView === 'week') {
      const nextDate = addDays(weekStart, direction * 7)
      const nextDateKey = toDateKey(nextDate.toISOString())
      selectDate(nextDateKey)
      setMonthAnchorDate(startOfMonth(nextDate))
      return
    }

    const nextMonth = addMonths(monthAnchorDate, direction)
    const nextMonthKey = toDateKey(nextMonth.toISOString())
    const firstSlotInMonth = data.slots.find((slot) => {
      const slotDate = new Date(slot.value)
      return (
        slotDate.getFullYear() === nextMonth.getFullYear() &&
        slotDate.getMonth() === nextMonth.getMonth()
      )
    })

    setMonthAnchorDate(nextMonth)
    selectDate(firstSlotInMonth ? toDateKey(firstSlotInMonth.value) : nextMonthKey)
  }
  const switchCalendarView = (view: CalendarView) => {
    setCalendarView(view)
    if (view === 'month') {
      setMonthAnchorDate(startOfMonth(selectedDate))
    }
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="trainer_id" value={data.trainer.profileId} />
      <input type="hidden" name="plan_id" value={selectedMenuId} />
      <input type="hidden" name="scheduled_at" value={effectiveSelectedSlot} />

      {state && 'error' in state && (
        <div className="rounded-[6px] border-2 border-[#D4183D] bg-[#FEF2F2] px-4 py-3 text-sm font-bold text-[#D4183D]">
          {state.error}
        </div>
      )}

      <div className="fitall-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="fitall-step-num h-7 w-7 text-[11px]">1</span>
          <label className="fitall-section-title">初回購入するメニュー</label>
        </div>
        <div className="space-y-2">
          {hasMenus ? (
            data.menus.map((menu) => (
              <button
                key={menu.id}
                type="button"
                onClick={() => setSelectedMenuId(menu.id)}
                className={`fitall-tap flex w-full items-center justify-between rounded-[6px] border-2 px-4 py-3 text-left transition ${
                  selectedMenuId === menu.id
                    ? 'border-[#0A0A0A] bg-[#E8FBFA]'
                    : 'border-[#DDE8E8] bg-white'
                }`}
              >
                  <span>
                    <span className="block text-sm font-black text-[#0A0A0A]">{menu.name}</span>
                    <span className="text-xs font-bold text-[#64748B]">
                      {menu.billing_type === 'monthly'
                        ? `月謝 / 毎月${menu.sessions}枚付与`
                        : `回数券 / ${menu.sessions}枚`}
                    </span>
                    {menu.description && (
                      <span className="mt-1 line-clamp-2 block text-xs font-bold leading-relaxed text-[#555555]">
                        {menu.description}
                      </span>
                    )}
                  </span>
                  <span className="text-right text-sm font-black text-[#0A0A0A]">
                    ¥{menu.price.toLocaleString()}
                    {menu.billing_type === 'monthly' && (
                      <span className="block text-[10px] text-[#087D78]">毎月</span>
                    )}
                  </span>
              </button>
            ))
          ) : (
            <div className="rounded-[6px] border-2 border-dashed border-[#DDE8E8] bg-[#F4F7F7] px-4 py-6 text-center text-sm font-bold text-[#555555]">
              購入できるメニューがまだ準備中です
            </div>
          )}
        </div>
      </div>

      <div className="fitall-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="fitall-step-num h-7 w-7 text-[11px]">2</span>
          <label className="fitall-section-title">最初の予約日時</label>
        </div>
        {hasSlots ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => switchCalendarView('week')}
                className={`fitall-tap h-10 rounded-[6px] border-2 text-xs font-black ${
                  calendarView === 'week'
                    ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                    : 'border-[#DDE8E8] bg-white text-[#555555]'
                }`}
              >
                週
              </button>
              <button
                type="button"
                onClick={() => switchCalendarView('month')}
                className={`fitall-tap h-10 rounded-[6px] border-2 text-xs font-black ${
                  calendarView === 'month'
                    ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                    : 'border-[#DDE8E8] bg-white text-[#555555]'
                }`}
              >
                月
              </button>
            </div>

            <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
              <button
                type="button"
                onClick={() => movePeriod(-1)}
                disabled={isPreviousDisabled}
                className="fitall-tap h-10 rounded-[6px] border-2 border-[#DDE8E8] bg-white text-lg font-black text-[#0A0A0A] disabled:opacity-30"
                aria-label={calendarView === 'week' ? '前の週' : '前の月'}
              >
                ‹
              </button>
              <div className="border-2 border-[#0A0A0A] bg-[#0A0A0A] px-3 py-2 text-center text-xs font-black text-white">
                {periodLabel}
              </div>
              <button
                type="button"
                onClick={() => movePeriod(1)}
                disabled={isNextDisabled}
                className="fitall-tap h-10 rounded-[6px] border-2 border-[#DDE8E8] bg-white text-lg font-black text-[#0A0A0A] disabled:opacity-30"
                aria-label={calendarView === 'week' ? '次の週' : '次の月'}
              >
                ›
              </button>
            </div>

            {calendarView === 'week' ? (
              <div className="overflow-hidden border-2 border-[#DDE8E8] bg-white">
                <div className="grid grid-cols-[46px_repeat(7,minmax(0,1fr))] border-b-2 border-[#DDE8E8]">
                  <div className="border-r-2 border-[#DDE8E8] bg-[#0A0A0A]" />
                  {weekDays.map((day) => {
                    const openCount = slotCountsByDate.get(day.dateKey) ?? 0
                    const selected = day.dateKey === selectedDateKey
                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        onClick={() => selectDate(day.dateKey)}
                        className={`fitall-tap min-h-[50px] border-r px-1 py-2 text-center last:border-r-0 ${
                          selected
                            ? 'bg-[#0A0A0A] text-white'
                            : openCount
                              ? 'bg-[#E8FBFA] text-[#0A0A0A]'
                              : 'bg-[#F4F7F7] text-[#555555]'
                        }`}
                      >
                        <p className="text-[10px] font-black leading-tight">{day.dateLabel}</p>
                        <p className={`mt-0.5 text-[9px] font-black leading-tight ${selected ? 'text-white/80' : 'text-[#087D78]'}`}>
                          {day.weekday}
                        </p>
                      </button>
                    )
                  })}
                </div>
                <div className="max-h-[356px] overflow-y-auto overscroll-contain">
                  <div className="grid grid-cols-[46px_repeat(7,minmax(0,1fr))]">
                    {timeRows.map((minutes) => {
                      const time = minutesToTime(minutes)
                      return (
                        <div key={time} className="contents">
                          <div className="flex h-11 items-center justify-center border-b border-r-2 border-[#DDE8E8] bg-[#F4F7F7]">
                            <p className="text-[9px] font-black text-[#555555]">{time}</p>
                          </div>
                          {weekDays.map((day) => {
                            const slot =
                              slotMap.get(`${day.dateKey}-${time}`) ??
                              slotMap.get(`${day.dateKey}-${time.slice(0, 2)}`)
                            const selected = !!slot && effectiveSelectedSlot === slot.value
                            return slot ? (
                              <button
                                key={`${day.dateKey}-${time}`}
                                type="button"
                                onClick={() => {
                                  setSelectedSlot(slot.value)
                                  setSelectedDateKey(day.dateKey)
                                }}
                                className={`fitall-tap flex h-11 items-center justify-center border-b border-r text-sm font-black last:border-r-0 ${
                                  selected
                                    ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                                    : 'border-[#DDE8E8] bg-[#12C7BE] text-white'
                                }`}
                                aria-label={`${day.dateLabel} ${slot.label}を選択`}
                              >
                                <span className="flex flex-col items-center leading-none">
                                  <span>○</span>
                                  <span className="mt-0.5 text-[8px]">
                                    {minutesToTime(slotTimeMinutes(slot.value))}
                                  </span>
                                </span>
                              </button>
                            ) : (
                              <div
                                key={`${day.dateKey}-${time}`}
                                className="flex h-11 items-center justify-center border-b border-r border-[#DDE8E8] bg-[#F4F7F7] text-xs font-black text-[#A8B2B2] last:border-r-0"
                              >
                                ×
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-hidden border-2 border-[#DDE8E8] bg-white">
                  <div className="grid grid-cols-7 border-b-2 border-[#DDE8E8] bg-[#0A0A0A] text-center text-[10px] font-black text-white">
                    {['月', '火', '水', '木', '金', '土', '日'].map((weekday) => (
                      <div key={weekday} className="border-r border-white/20 py-2 last:border-r-0">
                        {weekday}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {monthDays.map((day) => {
                      const openCount = slotCountsByDate.get(day.dateKey) ?? 0
                      const selected = day.dateKey === selectedDateKey
                      return (
                        <button
                          key={day.dateKey}
                          type="button"
                          onClick={() => {
                            if (!day.inCurrentMonth) {
                              setMonthAnchorDate(startOfMonth(day.date))
                            }
                            selectDate(day.dateKey)
                          }}
                          className={`fitall-tap min-h-[48px] border-b border-r px-1 py-2 text-left last:border-r-0 ${
                            selected
                              ? 'bg-[#0A0A0A] text-white'
                              : day.inCurrentMonth
                                ? openCount
                                  ? 'bg-[#E8FBFA] text-[#0A0A0A]'
                                  : 'bg-white text-[#A8B2B2]'
                                : 'bg-[#F4F7F7] text-[#CBD5D5]'
                          }`}
                        >
                          <span className="block text-xs font-black leading-none">{day.dateLabel}</span>
                          <span className={`mt-1 block text-[9px] font-black ${selected ? 'text-white/80' : openCount ? 'text-[#087D78]' : 'text-[#A8B2B2]'}`}>
                            {openCount ? '○' : '×'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="overflow-hidden border-2 border-[#DDE8E8] bg-white">
                  <div className="border-b-2 border-[#DDE8E8] bg-[#F4F7F7] px-3 py-2">
                    <p className="text-xs font-black text-[#0A0A0A]">
                      {dateFromKey(selectedDateKey).toLocaleDateString('ja-JP', {
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short',
                      })}
                    </p>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto overscroll-contain">
                    <div className="grid grid-cols-[70px_1fr]">
                      {timeRows.map((minutes) => {
                        const time = minutesToTime(minutes)
                        const slot =
                          slotMap.get(`${selectedDateKey}-${time}`) ??
                          slotMap.get(`${selectedDateKey}-${time.slice(0, 2)}`)
                        const selected = !!slot && effectiveSelectedSlot === slot.value
                        return (
                          <div key={time} className="contents">
                            <div className="flex h-12 items-center justify-center border-b border-r-2 border-[#DDE8E8] bg-[#F4F7F7]">
                              <p className="text-[10px] font-black text-[#555555]">{time}</p>
                            </div>
                            {slot ? (
                              <button
                                type="button"
                                onClick={() => setSelectedSlot(slot.value)}
                                className={`fitall-tap flex h-12 items-center justify-between border-b px-4 text-sm font-black ${
                                  selected
                                    ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                                    : 'border-[#DDE8E8] bg-[#12C7BE] text-white'
                                }`}
                              >
                                <span>○ 予約できます</span>
                                <span className="text-xs">{minutesToTime(slotTimeMinutes(slot.value))}</span>
                              </button>
                            ) : (
                              <div className="flex h-12 items-center justify-between border-b border-[#DDE8E8] bg-[#F4F7F7] px-4 text-xs font-black text-[#A8B2B2]">
                                <span>×</span>
                                <span>満席</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="border-2 border-[#DDE8E8] bg-[#F4F7F7] px-3 py-2">
              <p className="text-[10px] font-black text-[#087D78]">選択中</p>
              <p className="mt-1 text-sm font-black text-[#0A0A0A]">
                {formatSelectedSlot(effectiveSelectedSlot)}
              </p>
              <p className="mt-1 text-[11px] font-bold text-[#555555]">
                ○が予約可能、×が満席です。
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-[6px] border-2 border-dashed border-[#DDE8E8] bg-[#F4F7F7] px-4 py-6 text-center text-sm font-bold text-[#555555]">
            予約できる枠がありません
          </div>
        )}
      </div>

      <div className="fitall-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="fitall-step-num h-7 w-7 text-[11px]">3</span>
          <label className="fitall-section-title">お客様情報</label>
        </div>
        <div className="space-y-3">
          <input
            name="customer_name"
            required
            autoComplete="name"
            placeholder="お名前"
            className="fitall-focus-ring h-14 w-full rounded-[6px] border-2 border-[#DDE8E8] bg-white px-4 text-base font-bold text-[#0A0A0A] outline-none placeholder:text-gray-400 focus:border-[#12C7BE]"
          />
          <input
            name="customer_email"
            type="email"
            required
            autoComplete="email"
            placeholder="メールアドレス"
            className="fitall-focus-ring h-14 w-full rounded-[6px] border-2 border-[#DDE8E8] bg-white px-4 text-base font-bold text-[#0A0A0A] outline-none placeholder:text-gray-400 focus:border-[#12C7BE]"
          />
          <input
            name="customer_phone"
            type="tel"
            autoComplete="tel"
            placeholder="電話番号"
            className="fitall-focus-ring h-14 w-full rounded-[6px] border-2 border-[#DDE8E8] bg-white px-4 text-base font-bold text-[#0A0A0A] outline-none placeholder:text-gray-400 focus:border-[#12C7BE]"
          />
        </div>
      </div>

      <SubmitButton
        disabled={!hasMenus || !hasSlots || !effectiveSelectedSlot}
        className="mt-2 inline-flex h-14 w-full items-center justify-center rounded-[6px] border-2 border-[#0A0A0A] bg-[#0A0A0A] px-5 text-base font-black text-white transition-transform active:scale-[0.98] disabled:opacity-40"
      >
        初回チケットを購入して予約する
      </SubmitButton>
    </form>
  )
}
