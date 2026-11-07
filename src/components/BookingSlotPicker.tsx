'use client'

import { useMemo, useState } from 'react'
import type { PublicBookingSlot } from '@/lib/public-booking'
import { bookingDays } from '@/lib/booking-selection'
import { formatJstDate, formatJstTime, parseJstDateTime } from '@/lib/datetime'
import styles from './BookingSlotPicker.module.css'

export function BookingSlotPicker({ slots, value, onChange, disabled = false }: {
  slots: PublicBookingSlot[]; value: string; onChange: (value: string) => void; disabled?: boolean
}) {
  const days = useMemo(() => bookingDays(slots), [slots])
  const [dateKey, setDateKey] = useState(days[0]?.dateKey ?? '')
  const [week, setWeek] = useState(0)
  const visibleWeek = Math.min(week, Math.max(0, Math.ceil(days.length / 7) - 1))
  const visibleDays = days.slice(visibleWeek * 7, visibleWeek * 7 + 7)
  const activeDate = days.some(day => day.dateKey === dateKey) ? dateKey : visibleDays[0]?.dateKey
  const dateSlots = days.find(day => day.dateKey === activeDate)?.slots ?? []
  function changeWeek(nextWeek: number) {
    setWeek(nextWeek)
    setDateKey(days[nextWeek * 7]?.dateKey ?? '')
    onChange('')
  }
  if (!days.length) return <p className={styles.empty}>現在、予約できる空き枠がありません。</p>
  return <fieldset disabled={disabled} className={styles.picker} aria-label="予約日時">
    <div className={styles.period}>
      <button type="button" aria-label="前の週" disabled={visibleWeek === 0} onClick={() => changeWeek(visibleWeek - 1)}>‹</button>
      <p>{formatJstDate(parseJstDateTime(visibleDays[0].dateKey, '00:00'), { year: 'numeric', month: 'long' })}</p>
      <button type="button" aria-label="次の週" disabled={(visibleWeek + 1) * 7 >= days.length} onClick={() => changeWeek(visibleWeek + 1)}>›</button>
    </div>
    <div className={styles.days} aria-label="予約日">
      {visibleDays.map(day => {
        const date = parseJstDateTime(day.dateKey, '00:00')
        return <button type="button" key={day.dateKey} disabled={!day.slots.length} aria-pressed={activeDate === day.dateKey}
          aria-label={`${formatJstDate(date, { month: 'long', day: 'numeric', weekday: 'long' })}${day.slots.length ? '' : ' 空きなし'}`}
          onClick={() => { if (activeDate !== day.dateKey) { setDateKey(day.dateKey); onChange('') } }}>
          <small>{formatJstDate(date, { weekday: 'short' })}</small>
          <strong>{formatJstDate(date, { month: 'numeric', day: 'numeric' })}</strong>
          <small>{day.slots.length ? '空きあり' : '—'}</small>
        </button>
      })}
    </div>
    <p className={styles.dateTitle}>{formatJstDate(parseJstDateTime(activeDate!, '00:00'), { month: 'long', day: 'numeric', weekday: 'short' })}の空き時間 <small>日本時間</small></p>
    <div key={activeDate} className={styles.times} aria-label="予約時間">
      {dateSlots.map(slot => <button type="button" key={slot.value} aria-pressed={value === slot.value}
        onClick={() => onChange(slot.value)}>{formatJstTime(slot.value)}</button>)}
    </div>
    {!dateSlots.length && <p className={styles.empty}>この日は空きがありません。別の日付を選んでください。</p>}
  </fieldset>
}
