import type { ReactNode } from 'react'
import s from './ui.module.css'

// 画面の主役になる大きな数字（今月の売上など）
export function Hero({ value, note }: { value: ReactNode; note?: ReactNode }) {
  return (
    <div className={s.hero}>
      <p className={s.heroValue}>{value}</p>
      {note ? <p className={s.heroNote}>{note}</p> : null}
    </div>
  )
}

// 月ごとの棒。最後（今月）だけアクア
export function Bars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((item) => item.value))
  return (
    <div className={s.bars} role="img" aria-label={data.map((item) => `${item.label} ¥${item.value.toLocaleString()}`).join('、')}>
      {data.map((item, index) => (
        <div key={item.label} className={s.bar} data-now={index === data.length - 1}>
          <i style={{ height: `${Math.max(3, (item.value / max) * 100)}%` }} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}

// 数字を3つ横に並べる帯
export function Stats({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <div className={s.stats}>
      {items.map((item) => <div key={item.label}><small>{item.label}</small><b>{item.value}</b></div>)}
    </div>
  )
}
