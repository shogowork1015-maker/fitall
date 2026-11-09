import type { ReactNode } from 'react'
import s from './ui.module.css'

export type WeekDay = {
  key: string
  weekday: string
  day: number
  /** 予約や空きがない日は数字を薄くする */
  empty?: boolean
  disabled?: boolean
  label?: string
}

// 週の帯。選んだ日だけ黒く塗る。scroll を指定すると横にめくれる
export function Week({ days, selected, onSelect, scroll = false, label = '日付' }: {
  days: WeekDay[]
  selected: string
  onSelect: (key: string) => void
  scroll?: boolean
  label?: string
}) {
  return (
    <div className={scroll ? s.weekScroll : s.week} role="group" aria-label={label}>
      {days.map((day) => (
        <button
          key={day.key}
          type="button"
          className={s.day}
          data-key={day.key}
          aria-pressed={day.key === selected}
          aria-label={day.label}
          data-empty={day.empty}
          disabled={day.disabled}
          onClick={() => onSelect(day.key)}
        >
          <small>{day.weekday}</small>
          <strong>{day.day}</strong>
        </button>
      ))}
    </div>
  )
}

// 週の帯の下の1行（今週の件数など）
export function WeekLine({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return <div className={s.weekLine}><span>{left}</span>{right}</div>
}
