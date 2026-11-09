'use client'

import type { CSSProperties } from 'react'
import s from './ui.module.css'

// 黒い丸型の切り替え（カシカリ帳の「全て／貸した／借りた」と同じ形）
export function Segmented<T extends string>({ options, value, onChange, label }: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  const index = Math.max(0, options.findIndex((option) => option.value === value))
  return (
    <div role="group" aria-label={label} className={s.segmented} style={{ '--count': options.length } as CSSProperties}>
      <span aria-hidden="true" className={s.segmentedThumb} style={{ transform: `translateX(${index * 100}%)` }} />
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  )
}
