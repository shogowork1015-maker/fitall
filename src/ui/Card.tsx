import type { ReactNode } from 'react'
import s from './ui.module.css'

// 黒い面。その画面の主役（次のセッション・チケットなど）を1つだけ置く
export function Card({ children, label }: { children: ReactNode; label?: string }) {
  return <section className={s.card} aria-label={label}>{children}</section>
}

// 黒い面の上の行（左に種類、右に補足）
export function CardTop({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return <div className={s.cardTop}><span>{left}</span>{right ? <span>{right}</span> : null}</div>
}

// 黒い面の大きな数字（例：2回 ／ 4回）
export function CardBig({ value, unit, of }: { value: ReactNode; unit?: string; of?: string }) {
  return (
    <p className={s.cardBig}>
      {value}
      {unit ? <small>{unit}</small> : null}
      {of ? <span className={s.of}>{of}</span> : null}
    </p>
  )
}

export function CardName({ children }: { children: ReactNode }) {
  return <p className={s.cardName}>{children}</p>
}

export function CardSub({ children }: { children: ReactNode }) {
  return <p className={s.cardSub}>{children}</p>
}

// アクアの小さな丸型の文字（「あと45分」など）
export function Pill({ children }: { children: ReactNode }) {
  return <span className={s.pill}>{children}</span>
}

// 今日の進み具合（終わった分だけアクア）
export function Progress({ total, done }: { total: number; done: number }) {
  if (total <= 0) return null
  return (
    <div className={s.progress} aria-hidden="true">
      {Array.from({ length: total }, (_, index) => <span key={index} data-done={index < done} />)}
    </div>
  )
}

// 回数券の穴。残り＝アクア、予約済み＝アクアの輪、使用済み＝薄い丸
export function Punches({ total, used, booked }: { total: number; used: number; booked: number }) {
  if (total <= 0 || total > 12) return null
  return (
    <div className={s.punches} aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className={s.punch} data-state={index < used ? 'used' : index < used + booked ? 'booked' : 'left'} />
      ))}
    </div>
  )
}

// 黒い面の下の数字の並び（予約済み・使用済みなど）
export function CardFoot({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <div className={s.cardFoot}>
      {items.map((item) => <div key={item.label}><span>{item.label}</span><b>{item.value}</b></div>)}
    </div>
  )
}

export function CardAction({ children }: { children: ReactNode }) {
  return <div className={s.cardAction}>{children}</div>
}

// 黒い面の中の一覧（チケットが残り少ない人など）
export function CardList({ children }: { children: ReactNode }) {
  return <div className={s.cardList}>{children}</div>
}

export function CardItem({ title, subtitle, trailing }: { title: ReactNode; subtitle?: ReactNode; trailing?: ReactNode }) {
  return (
    <div className={s.cardItem}>
      <div><b>{title}</b>{subtitle ? <span>{subtitle}</span> : null}</div>
      {trailing}
    </div>
  )
}
