import Link from 'next/link'
import type { ReactNode } from 'react'
import s from './ui.module.css'

export type SlotTone = 'normal' | 'action' | 'done'

// 時間の流れ。左に時刻、縦の線、右に予約の面を置く
export function Timeline({ children }: { children: ReactNode }) {
  return (
    <div className={s.timeline}>
      <div className={s.rail} aria-hidden="true" />
      {children}
    </div>
  )
}

// 予約1件。対応が必要なものはアクアで塗る
export function Slot({ time, end, name, meta, tone = 'normal', right, href, onClick }: {
  time: string
  end?: string
  name: ReactNode
  meta?: ReactNode
  tone?: SlotTone
  /** 右側（金額や「承認」ボタン） */
  right?: ReactNode
  href?: string
  onClick?: () => void
}) {
  const inner = (
    <>
      <span className={s.slotMain}>
        <span className={s.slotName}>{name}</span>
        {meta ? <span className={s.slotMeta}>{meta}</span> : null}
      </span>
      {right ? <span className={s.slotRight}>{right}</span> : null}
    </>
  )
  return (
    <div className={s.slot}>
      <div className={s.slotTime}>{time}{end ? <small>〜{end}</small> : null}</div>
      {href ? (
        <Link href={href} className={s.slotCard} data-tone={tone}>{inner}</Link>
      ) : onClick ? (
        <div className={s.slotCard} data-tone={tone} role="button" tabIndex={0} onClick={onClick} onKeyDown={(event) => { if (event.key === 'Enter') onClick() }}>{inner}</div>
      ) : (
        <div className={s.slotCard} data-tone={tone}>{inner}</div>
      )}
      <span className={s.slotDot} data-tone={tone} aria-hidden="true" />
    </div>
  )
}

// 予約と予約のあいだの空き時間
export function Gap({ children }: { children: ReactNode }) {
  return (
    <div className={s.slot}>
      <div />
      <div className={s.slotGap}>{children}</div>
    </div>
  )
}

// 開始時刻と長さ（分）から、終わりの時刻と次までの空きを計算する
export function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number)
  const total = (h ?? 0) * 60 + (m ?? 0) + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function gapLabel(fromTime: string, toTime: string) {
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return (h ?? 0) * 60 + (m ?? 0) }
  const diff = toMin(toTime) - toMin(fromTime)
  if (diff < 30) return null
  const hours = Math.floor(diff / 60)
  const minutes = diff % 60
  return `空き ${hours ? `${hours}時間` : ''}${minutes ? `${minutes}分` : ''}`
}

// 最後の予約のあと、受付終了まで空いているときの1行
export function freeAfterLabel(lastEnd: string, closeTime = '21:00') {
  return gapLabel(lastEnd, closeTime) ? `${lastEnd}以降は空いています` : null
}
