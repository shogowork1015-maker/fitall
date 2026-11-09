import Link from 'next/link'
import type { ReactNode } from 'react'
import s from './ui.module.css'
import { ChevronRight } from './icons'

// 日付を左に大きく置く一覧（予約・明細・履歴）
export function DateList({ children }: { children: ReactNode }) {
  return <div className={s.dates}>{children}</div>
}

export function DateRow({ day, sub, title, meta, right, strongRight = false, small = false, action = false, chevron = false, href, onClick }: {
  /** 左の大きな数字（日付） */
  day: ReactNode
  /** 数字の下（月・曜日） */
  sub?: ReactNode
  title: ReactNode
  meta?: ReactNode
  right?: ReactNode
  strongRight?: boolean
  /** 左の日付を小さめにする（11/8 のような書き方のとき） */
  small?: boolean
  /** 対応が必要な行はアクアで塗る */
  action?: boolean
  /** 押すと詳しく見られる行に「›」を出す */
  chevron?: boolean
  href?: string
  onClick?: () => void
}) {
  const inner = (
    <>
      <span className={s.dateDay} data-size={small ? 'small' : undefined}>{day}{sub ? <small>{sub}</small> : null}</span>
      <span className={s.dateMain}><b>{title}</b>{meta ? <span>{meta}</span> : null}</span>
      <span className={s.dateRight} data-strong={strongRight} data-chevron={chevron}>
        {right}
        {chevron ? <ChevronRight className={s.chevron} /> : null}
      </span>
    </>
  )
  const tone = action ? 'action' : undefined
  if (href) return <Link href={href} className={s.dateRow} data-tone={tone}>{inner}</Link>
  if (onClick) return <button type="button" onClick={onClick} className={s.dateRow} data-tone={tone}>{inner}</button>
  return <div className={s.dateRow} data-tone={tone}>{inner}</div>
}
