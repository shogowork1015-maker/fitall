import Link from 'next/link'
import type { ReactNode } from 'react'
import s from './ui.module.css'
import { ChevronLeft } from './icons'

// 画面の土台。上に小さな補足（日付など）か戻るリンク、その下に大きな見出しを置く
export function Screen({ title, caption, subtitle, back, actions, nameTitle = false, children }: {
  /** 大きな見出し */
  title?: string
  /** 見出しの上の小さな補足（日付・件数など） */
  caption?: ReactNode
  /** 見出しの下の補足 */
  subtitle?: ReactNode
  /** 左上の戻る */
  back?: { href: string; label: string }
  /** 右上の記号だけのボタン */
  actions?: ReactNode
  /** 人の名前など、少し小さめの見出しにする */
  nameTitle?: boolean
  children: ReactNode
}) {
  return (
    <div className={s.screen}>
      <header className={s.header}>
        <div className={s.headerTop}>
          {back ? (
            <Link href={back.href} className={s.back}>
              <ChevronLeft />
              <span>{back.label}</span>
            </Link>
          ) : caption ? <p className={s.caption}>{caption}</p> : <span />}
          {actions ? <div className={s.actions}>{actions}</div> : null}
        </div>
        {title ? <h1 className={s.title} data-size={nameTitle ? 'name' : undefined}>{title}</h1> : null}
        {subtitle ? <p className={s.subtitle}>{subtitle}</p> : null}
      </header>
      <main className={s.body}>{children}</main>
    </div>
  )
}

// 見出し横の記号だけのリンク（丸で囲まない）
export function IconLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Link href={href} aria-label={label} title={label} className={s.icon}>
      {children}
    </Link>
  )
}

// 見出し横の記号だけのボタン（シートを開くときなど）
export function IconButton({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={s.icon}>
      {children}
    </button>
  )
}

// 画面のいちばん下に置く小さな注記
export function Note({ children }: { children: ReactNode }) {
  return <p className={s.note}>{children}</p>
}
