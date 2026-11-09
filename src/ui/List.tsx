import Link from 'next/link'
import type { ReactNode } from 'react'
import s from './ui.module.css'
import { ChevronRight } from './icons'

// まとまり。title は大きな見出し、header は小さな灰色の見出し。
// group を指定すると薄い灰色の面で束ねる（設定アプリの形）
export function Section({ title, header, action, footer, group = false, label, children }: {
  title?: ReactNode
  header?: ReactNode
  /** 見出しの右（件数や文字のリンク） */
  action?: ReactNode
  footer?: ReactNode
  group?: boolean
  label?: string
  children: ReactNode
}) {
  return (
    <section className={s.section} aria-label={label}>
      {title ? (
        <h2 className={s.sectionTitle}>
          <span>{title}</span>
          {action ? <span className={s.sectionAction}>{action}</span> : null}
        </h2>
      ) : header ? (
        <h2 className={s.sectionHeader}>
          <span>{header}</span>
          {action ? <span className={s.sectionAction}>{action}</span> : null}
        </h2>
      ) : null}
      {group ? <div className={s.group}>{children}</div> : children}
      {footer ? <p className={s.sectionFooter}>{footer}</p> : null}
    </section>
  )
}

// 薄い灰色の面（Section を使わずに束ねたいとき）
export function Group({ children }: { children: ReactNode }) {
  return <div className={s.group}>{children}</div>
}

type RowProps = {
  title: ReactNode
  subtitle?: ReactNode
  value?: ReactNode
  strongValue?: boolean
  strong?: boolean
  /** 対応が必要な行はアクアで塗る */
  action?: boolean
  href?: string
  external?: boolean
  onClick?: () => void
  chevron?: boolean
  trailing?: ReactNode
}

// 面の中の1行。左に題名と補足、右に値と矢印
export function Row({ title, subtitle, value, strongValue = false, strong = false, action = false, href, external = false, onClick, chevron, trailing }: RowProps) {
  const showChevron = chevron ?? Boolean(href || onClick)
  const content = (
    <>
      <span className={s.rowMain}>
        <span className={s.rowTitle} data-strong={strong}>{title}</span>
        {subtitle ? <span className={s.rowSubtitle}>{subtitle}</span> : null}
      </span>
      {value !== undefined && value !== null ? <span className={s.rowValue} data-tone={strongValue ? 'strong' : undefined}>{value}</span> : null}
      {trailing}
      {showChevron ? <ChevronRight className={s.chevron} /> : null}
    </>
  )
  const tone = action ? 'action' : undefined
  if (href && external) return <a href={href} target="_blank" rel="noreferrer" className={s.row} data-tone={tone}>{content}</a>
  if (href) return <Link href={href} className={s.row} data-tone={tone}>{content}</Link>
  if (onClick) return <button type="button" onClick={onClick} className={s.row} data-tone={tone}>{content}</button>
  return <div className={s.row} data-tone={tone}>{content}</div>
}

// 予約の状態は文字だけで示す（札や色は使わない）
const STATUS_LABEL: Record<string, string> = {
  confirmed: '確定',
  pending: '承認待ち',
  completed: '完了',
  cancelled: 'キャンセル',
  rejected: 'キャンセル',
}

export function statusText(status: string) {
  return STATUS_LABEL[status] ?? '確認中'
}

// 画面上部のお知らせ（完了・エラー）
export function Banner({ tone = 'info', children }: { tone?: 'info' | 'error'; children: ReactNode }) {
  return <p role={tone === 'error' ? 'alert' : 'status'} className={s.banner} data-tone={tone}>{children}</p>
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className={s.empty}>{children}</p>
}
