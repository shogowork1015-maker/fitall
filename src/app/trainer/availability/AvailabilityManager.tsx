'use client'

import { useEffect, useMemo, useState } from 'react'
import { applyWeeklyPresetAction, saveAvailabilityAction } from './actions'
import { Toast } from '@/components/Toast'
import { SelectionPopover } from './SelectionPopover'

type ViewMode = 'day' | 'week' | 'month'

interface DaySlot {
  slot_date: string
  enabled: boolean
  start_time: string
  end_time: string
}

interface CalendarBooking {
  id: string
  scheduled_at: string
  status: string
  trainee_name: string
}

interface Props {
  initialSlots: { slot_date: string; start_time: string; end_time: string }[]
  initialBookings: CalendarBooking[]
  clientOptions: { trainee_id: string; name: string }[]
  menuOptions: { id: string; name: string; price: number }[]
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']
const GRID_HOURS = Array.from({ length: 24 }, (_, i) => i) // 0:00 - 23:00
const TIME_OPTIONS = Array.from({ length: 24 * 6 + 1 }, (_, i) => {
  const totalMinutes = i * 10
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
})

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function timeToHour(time: string): number {
  return parseInt(time.slice(0, 2), 10)
}

function hourToTime(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

function bookingBadgeClass(status: string): string {
  if (status === 'confirmed') return 'bg-accent-soft text-brand'
  if (status === 'pending') return 'bg-accent-soft text-brand'
  if (status === 'completed') return 'bg-accent-soft text-brand'
  return 'bg-surface-soft text-ink-muted'
}

function viewTitle(view: ViewMode): string {
  if (view === 'day') return '1日表示'
  if (view === 'week') return '週表示'
  return '月表示'
}

export function AvailabilityManager({ initialSlots, initialBookings, clientOptions, menuOptions }: Props) {
  const initDays = (): DaySlot[] =>
    initialSlots.map((s) => ({
      slot_date: s.slot_date,
      enabled: true,
      start_time: s.start_time.slice(0, 5),
      end_time: s.end_time.slice(0, 5),
    }))

  const [days, setDays] = useState<DaySlot[]>(initDays)
  const [view, setView] = useState<ViewMode>('week')
  const [focusDate, setFocusDate] = useState<Date>(new Date())
  const [selectedDateKey, setSelectedDateKey] = useState<string>(toDateKey(new Date()))
  const [dirty, setDirty] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [dragAnchor, setDragAnchor] = useState<{ dayOfWeek: number; hour: number } | null>(null)
  const [dragSelection, setDragSelection] = useState<{
    dayOfWeek: number
    startHour: number
    endHour: number
  } | null>(null)
  const [weeklyPresetDay, setWeeklyPresetDay] = useState<number>(1)
  const [weeklyPresetStart, setWeeklyPresetStart] = useState<string>('10:00')
  const [weeklyPresetEnd, setWeeklyPresetEnd] = useState<string>('20:00')
  const [presetSaving, setPresetSaving] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)

  const bookingsByDate = useMemo(() => {
    const map: Record<string, CalendarBooking[]> = {}
    for (const b of initialBookings) {
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
  }, [initialBookings])

  const weekDates = useMemo(() => {
    const start = startOfWeek(focusDate)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [focusDate])

  const monthDays = useMemo(() => {
    const first = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1)
    const gridStart = startOfWeek(first)
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  }, [focusDate])

  useEffect(() => {
    if (!dragging) return
    const onUp = () => {
      setDragging(false)
      setDragAnchor(null)
      if (dragSelection) {
        setPopoverOpen(true)
      }
    }
    window.addEventListener('mouseup', onUp)
    return () => window.removeEventListener('mouseup', onUp)
  }, [dragging, dragSelection])

  function move(direction: 'prev' | 'next') {
    const unit = direction === 'prev' ? -1 : 1
    if (view === 'day') setFocusDate((prev) => addDays(prev, unit))
    if (view === 'week') setFocusDate((prev) => addDays(prev, 7 * unit))
    if (view === 'month') {
      setFocusDate(
        (prev) => new Date(prev.getFullYear(), prev.getMonth() + unit, Math.min(prev.getDate(), 28))
      )
    }
  }

  function goToday() {
    const now = new Date()
    setFocusDate(now)
    setSelectedDateKey(toDateKey(now))
  }

  function validateAvailability(targetDays: DaySlot[]): string | null {
    for (const d of targetDays) {
      if (!d.enabled) continue
      if (d.start_time >= d.end_time) {
        return `${d.slot_date}: 開始時間は終了時間より前にしてください`
      }
    }
    return null
  }

  function toSlots(targetDays: DaySlot[]) {
    return targetDays
      .filter((d) => d.enabled)
      .map((d) => ({
        slot_date: d.slot_date,
        start_time: `${d.start_time}:00`,
        end_time: `${d.end_time}:00`,
      }))
  }

  async function persistDays(targetDays: DaySlot[]) {
    const validationError = validateAvailability(targetDays)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    const result = await saveAvailabilityAction(toSlots(targetDays))

    if (result.error) {
      setError(result.error)
      return
    }

    setDirty(false)
    setToast('空き時間を保存しました')
  }

  function beginDragSelection(date: Date, hour: number) {
    const dayOfWeek = date.getDay()
    setSelectedDateKey(toDateKey(date))
    setDragging(true)
    setDragAnchor({ dayOfWeek, hour })
    setDragSelection({ dayOfWeek, startHour: hour, endHour: hour + 1 })
  }

  function updateDragSelection(date: Date, hour: number) {
    if (!dragging || !dragAnchor) return
    const dayOfWeek = date.getDay()
    if (dayOfWeek !== dragAnchor.dayOfWeek) return
    const startHour = Math.min(dragAnchor.hour, hour)
    const endHour = Math.max(dragAnchor.hour, hour) + 1
    setDragSelection({ dayOfWeek, startHour, endHour })
  }

  async function applyDragSelection(
    mode: 'open' | 'block',
    options?: { persist?: boolean }
  ) {
    if (!dragSelection) return
    const { startHour, endHour } = dragSelection
    const targetDateKey = selectedDateKey
    setError(null)
    let changed = false
    const nextDays = days.map((d) => {
        if (d.slot_date !== targetDateKey) return d

        if (mode === 'open') {
          // 視覚的に分かりやすくするため、選択範囲で上書きする
          changed = true
          return {
            ...d,
            enabled: true,
            start_time: hourToTime(startHour),
            end_time: hourToTime(endHour),
          }
        }

        // block
        if (!d.enabled) return d

        const currentStart = timeToHour(d.start_time)
        const currentEnd = timeToHour(d.end_time)

        // 選択範囲が現在の受付と重ならない
        if (endHour <= currentStart || startHour >= currentEnd) {
          return d
        }

        // 全体を覆う -> 受付停止
        if (startHour <= currentStart && endHour >= currentEnd) {
          changed = true
          return { ...d, enabled: false }
        }

        // 先頭を削る
        if (startHour <= currentStart && endHour < currentEnd) {
          changed = true
          return { ...d, start_time: hourToTime(endHour) }
        }

        // 後半を削る
        if (startHour > currentStart && endHour >= currentEnd) {
          changed = true
          return { ...d, end_time: hourToTime(startHour) }
        }

        // 真ん中を削る場合: 1日1枠制約のため、長い側を残してブロックを反映
        const left = startHour - currentStart
        const right = currentEnd - endHour
        changed = true
        if (left >= right) {
          return { ...d, end_time: hourToTime(startHour) }
        }
        return { ...d, start_time: hourToTime(endHour) }
      })

    if (!nextDays.some((d) => d.slot_date === targetDateKey) && mode === 'open') {
      changed = true
      nextDays.push({
        slot_date: targetDateKey,
        enabled: true,
        start_time: hourToTime(startHour),
        end_time: hourToTime(endHour),
      })
    }

    if (changed) {
      setDays(nextDays)
      setDirty(true)
      if (options?.persist) {
        await persistDays(nextDays)
        setDragSelection(null)
      } else {
        setToast(mode === 'open' ? '選択範囲を空き時間に設定しました' : '選択範囲をブロックしました')
      }
    } else {
      setError('選択範囲に変更はありませんでした')
    }
  }

  async function handleApplyWeeklyPreset(mode: 'open' | 'block') {
    if (mode === 'open' && weeklyPresetStart >= weeklyPresetEnd) {
      setError('繰り返し設定: 開始時間は終了時間より前にしてください')
      return
    }
    setError(null)
    setPresetSaving(true)
    const result = await applyWeeklyPresetAction(
      weeklyPresetDay,
      `${weeklyPresetStart}:00`,
      `${weeklyPresetEnd}:00`,
      mode
    )
    setPresetSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setToast(
      mode === 'open'
        ? `毎週${DAY_NAMES[weeklyPresetDay]}曜日の${weeklyPresetStart}-${weeklyPresetEnd}を設定しました`
        : `毎週${DAY_NAMES[weeklyPresetDay]}曜日を休みに設定しました`
    )
    window.location.reload()
  }

  function availabilityText(date: Date): string {
    const slot = days.find((d) => d.slot_date === toDateKey(date))
    if (!slot?.enabled) return '受付なし'
    return `${slot.start_time} - ${slot.end_time}`
  }

  function renderMonthView() {
    const currentMonth = focusDate.getMonth()
    return (
      <div className="grid grid-cols-7 border border-line rounded-card overflow-hidden">
        {DAY_NAMES.map((name) => (
          <div
            key={`head-${name}`}
            className="h-14 flex items-center justify-center text-base font-medium text-ink-muted bg-white border-b border-line"
          >
            {name}
          </div>
        ))}
        {monthDays.map((date) => {
          const key = toDateKey(date)
          const bookings = bookingsByDate[key] ?? []
          const isCurrentMonth = date.getMonth() === currentMonth
          const isSelected = selectedDateKey === key
          const slotText = availabilityText(date)
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSelectedDateKey(key)
                setFocusDate(date)
              }}
              className={`min-h-[120px] p-2 border-b border-r border-line text-left align-top ${
                isSelected ? 'bg-accent-soft' : 'bg-white'
              } ${!isCurrentMonth ? 'text-ink-faint' : 'text-ink'}`}
            >
              <p className="text-base font-bold">{date.getDate()}</p>
              <p className="mt-1 text-base text-ink-muted">{slotText}</p>
              <div className="mt-1 space-y-1">
                {bookings.slice(0, 2).map((b) => (
                  <div
                    key={b.id}
                    className={`px-1.5 py-0.5 rounded text-base leading-tight font-semibold ${bookingBadgeClass(b.status)}`}
                  >
                    {new Date(b.scheduled_at).toLocaleTimeString('ja-JP', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    {b.trainee_name}
                  </div>
                ))}
                {bookings.length > 2 && (
                  <p className="text-base text-ink-muted">+{bookings.length - 2}件</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  function renderWeekOrDayView(mode: 'week' | 'day') {
    const columnDates = mode === 'day' ? [focusDate] : weekDates
    return (
      <div className="border border-line rounded-card overflow-x-auto">
        <div
          className={`grid min-w-[720px] ${
            mode === 'day'
              ? 'grid-cols-[72px_minmax(320px,1fr)]'
              : 'grid-cols-[72px_repeat(7,minmax(140px,1fr))]'
          }`}
        >
          <div className="h-14 border-b border-line bg-white" />
          {columnDates.map((date) => {
            const key = toDateKey(date)
            const isSelected = selectedDateKey === key
            return (
              <button
                key={`head-${key}`}
                type="button"
                onClick={() => setSelectedDateKey(key)}
                className={`h-14 border-b border-l border-line text-center ${
                  isSelected ? 'bg-accent-soft' : 'bg-white'
                }`}
              >
                <p className="text-base text-ink-muted">{DAY_NAMES[date.getDay()]}</p>
                <p className="text-base font-bold text-ink">
                  {date.getMonth() + 1}/{date.getDate()}
                </p>
              </button>
            )
          })}

          {GRID_HOURS.map((hour) => (
            <div key={`row-${hour}`} className="contents">
              <div className="h-[72px] px-2 border-b border-line bg-white">
                <p className="text-base text-ink-muted mt-2">{String(hour).padStart(2, '0')}:00</p>
              </div>
              {columnDates.map((date) => {
                const key = toDateKey(date)
                  const slot = days.find((d) => d.slot_date === key)
                const isOpen =
                  !!slot?.enabled &&
                  hour >= timeToHour(slot.start_time) &&
                  hour < timeToHour(slot.end_time)
                const hourBookings = (bookingsByDate[key] ?? []).filter((b) => {
                  const h = new Date(b.scheduled_at).getHours()
                  return h === hour
                })
                const isDragSelected =
                  dragSelection?.dayOfWeek === date.getDay() &&
                  hour >= dragSelection.startHour &&
                  hour < dragSelection.endHour
                return (
                  <div
                    key={`cell-${key}-${hour}`}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return
                      e.preventDefault()
                      beginDragSelection(date, hour)
                    }}
                    onMouseEnter={() => updateDragSelection(date, hour)}
                    style={
                      !isDragSelected && !isOpen
                        ? {
                            backgroundImage:
                              'linear-gradient(45deg, rgba(148,163,184,0.08) 25%, transparent 25%, transparent 50%, rgba(148,163,184,0.08) 50%, rgba(148,163,184,0.08) 75%, transparent 75%, transparent)',
                            backgroundSize: '10px 10px',
                          }
                        : undefined
                    }
                    className={`h-[72px] px-2 py-1 border-b border-l border-line select-none cursor-crosshair ${
                      isDragSelected
                        ? 'bg-accent-soft'
                        : isOpen
                          ? 'bg-accent-soft'
                          : 'bg-white'
                    }`}
                  >
                    <div className="space-y-1">
                      <p
                        className={`text-base font-medium ${
                          isOpen ? 'text-brand' : 'text-ink-muted'
                        }`}
                      >
                        {isOpen ? '空き' : 'ブロック'}
                      </p>
                      {hourBookings.map((b) => (
                        <div
                          key={b.id}
                          className={`px-2 py-1 rounded text-base leading-tight font-semibold pointer-events-none ${bookingBadgeClass(b.status)}`}
                        >
                          {new Date(b.scheduled_at).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          {b.trainee_name}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {error && (
        <div className="bg-danger-soft border border-danger-line rounded-control px-4 py-3 text-base text-danger">
          {error}
        </div>
      )}

      <div className="bg-white rounded-card border border-line p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-base font-medium text-ink-muted">
              {viewTitle(view)}
            </p>
            <p className="text-lg font-bold text-ink">
              {view === 'day' &&
                focusDate.toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              {view === 'week' &&
                `${weekDates[0]!.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })} - ${weekDates[6]!.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}`}
              {view === 'month' &&
                focusDate.toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                })}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {dirty && (
              <span className="h-14 inline-flex items-center px-3 rounded-control text-base font-bold bg-accent-soft text-brand border border-line">
                未保存の変更あり
              </span>
            )}
            {(['day', 'week', 'month'] as ViewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setView(m)}
                className={`h-14 px-4 rounded-control text-base font-medium ${
                  view === m
                    ? 'bg-ink text-white'
                    : 'bg-white text-ink-muted border border-line'
                }`}
              >
                {m === 'day' ? '1日' : m === 'week' ? '週' : '月'}
              </button>
            ))}
            <button
              type="button"
              onClick={() => move('prev')}
              className="h-14 w-14 rounded-control border border-line text-ink text-xl font-bold"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => move('next')}
              className="h-14 w-14 rounded-control border border-line text-ink text-xl font-bold"
            >
              ›
            </button>
            <button
              type="button"
              onClick={goToday}
              className="h-14 px-5 rounded-control border border-line text-base font-bold text-ink"
            >
              今日
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-white rounded-card border border-line p-3 space-y-3">
          <p className="text-base font-bold text-ink">毎週の繰り返し設定</p>
          <p className="text-base text-ink-muted">指定曜日をまとめて設定します（今後約6ヶ月に反映）</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select
              value={weeklyPresetDay}
              onChange={(e) => setWeeklyPresetDay(Number(e.target.value))}
              className="h-14 px-3 bg-white border border-line rounded-control text-base font-semibold text-ink focus:outline-none focus:border-ink"
            >
              {DAY_NAMES.map((name, idx) => (
                <option key={name} value={idx}>
                  毎週 {name}曜日
                </option>
              ))}
            </select>
            <select
              value={weeklyPresetStart}
              onChange={(e) => setWeeklyPresetStart(e.target.value)}
              className="h-14 px-3 bg-white border border-line rounded-control text-base font-semibold text-ink focus:outline-none focus:border-ink"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={`preset-start-${t}`} value={t}>
                  開始 {t}
                </option>
              ))}
            </select>
            <select
              value={weeklyPresetEnd}
              onChange={(e) => setWeeklyPresetEnd(e.target.value)}
              className="h-14 px-3 bg-white border border-line rounded-control text-base font-semibold text-ink focus:outline-none focus:border-ink"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={`preset-end-${t}`} value={t}>
                  終了 {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={presetSaving}
              onClick={() => void handleApplyWeeklyPreset('open')}
              className="h-12 px-4 rounded-control bg-ink text-white text-base font-bold disabled:opacity-40"
            >
              毎週この時間を空きにする
            </button>
            <button
              type="button"
              disabled={presetSaving}
              onClick={() => void handleApplyWeeklyPreset('block')}
              className="h-12 px-4 rounded-control border border-line text-ink bg-white text-base font-bold disabled:opacity-40"
            >
              毎週この曜日を休みにする
            </button>
          </div>
        </div>

        {(view === 'day' || view === 'week') && (
          <div className="flex flex-wrap gap-2 text-base font-semibold">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft text-brand px-3 py-1 border border-line">
              <span className="w-2 h-2 rounded-full bg-accent" />
              空き時間
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white text-ink-muted px-3 py-1 border border-line">
              <span className="w-2 h-2 rounded-full bg-line" />
              ブロック
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft text-brand px-3 py-1 border border-line">
              予約
            </span>
          </div>
        )}

        {(view === 'day' || view === 'week') && dragSelection && (
          <div className="bg-accent-soft border border-line rounded-control p-3 flex flex-wrap items-center gap-2">
            <p className="text-base text-brand font-semibold">
              選択: {DAY_NAMES[dragSelection.dayOfWeek]} {hourToTime(dragSelection.startHour)} -{' '}
              {hourToTime(dragSelection.endHour)}
            </p>
            <button
              type="button"
              onClick={() => setDragSelection(null)}
              className="h-11 px-4 rounded-control border border-line text-brand bg-white text-base font-bold"
            >
              解除
            </button>
            <p className="text-base text-brand">
              ドラッグ終了後に予約/ブロックのメニューが開きます
            </p>
          </div>
        )}
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekOrDayView('week')}
        {view === 'day' && renderWeekOrDayView('day')}

        <div className="bg-white rounded-card border border-line p-3 text-base text-ink-muted">
          日付をタップして、時間セルをドラッグすると空き時間/ブロックをその日付だけに設定できます。
        </div>
      </div>

      <SelectionPopover
        open={popoverOpen && !!dragSelection}
        onClose={() => {
          setPopoverOpen(false)
          setDragSelection(null)
        }}
        dateKey={selectedDateKey}
        startTime={dragSelection ? hourToTime(dragSelection.startHour) : '00:00'}
        endTime={dragSelection ? hourToTime(dragSelection.endHour) : '01:00'}
        clients={clientOptions}
        menus={menuOptions}
        onOpenSave={async () => {
          await applyDragSelection('open', { persist: true })
        }}
        onBlockSave={async (repeat, repeatStart, repeatUntil) => {
          if (!dragSelection) return
          if (!repeat) {
            await applyDragSelection('block', { persist: true })
            setPopoverOpen(false)
            setDragSelection(null)
            return
          }

          const [y, m, d] = selectedDateKey.split('-').map(Number)
          const base = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1)
          const start = new Date(`${repeatStart ?? selectedDateKey}T00:00:00`)
          const until = new Date(`${repeatUntil ?? selectedDateKey}T23:59:59`)
          const nextDays = [...days]

          for (let cursor = start; cursor <= until; cursor = addDays(cursor, 7)) {
            if (cursor.getDay() !== base.getDay()) continue
            const dateKey = toDateKey(cursor)
            const idx = nextDays.findIndex((v) => v.slot_date === dateKey)
            if (idx === -1) continue
            const row = nextDays[idx]!
            const currentStart = timeToHour(row.start_time)
            const currentEnd = timeToHour(row.end_time)
            const startHour = dragSelection.startHour
            const endHour = dragSelection.endHour
            if (endHour <= currentStart || startHour >= currentEnd) continue
            if (startHour <= currentStart && endHour >= currentEnd) {
              nextDays[idx] = { ...row, enabled: false }
            } else if (startHour <= currentStart && endHour < currentEnd) {
              nextDays[idx] = { ...row, start_time: hourToTime(endHour) }
            } else if (startHour > currentStart && endHour >= currentEnd) {
              nextDays[idx] = { ...row, end_time: hourToTime(startHour) }
            } else {
              const left = startHour - currentStart
              const right = currentEnd - endHour
              nextDays[idx] =
                left >= right
                  ? { ...row, end_time: hourToTime(startHour) }
                  : { ...row, start_time: hourToTime(endHour) }
            }
          }
          setDays(nextDays)
          await persistDays(nextDays)
          setPopoverOpen(false)
          setDragSelection(null)
        }}
      />
    </div>
  )
}
