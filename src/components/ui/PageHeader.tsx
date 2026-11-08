import Link from 'next/link'
import type { ReactNode } from 'react'

// スマホ画面上部のナビゲーションバー。iPhone標準アプリと同じく中央に題名、左右に丸いボタンを置く
export function PageHeader({ title, subtitle, back, leading, actions }: {
  title: string
  subtitle?: ReactNode
  /** 左上の戻るボタン */
  back?: { href: string; label: string }
  /** 左上に置く丸いボタン（戻るボタンがない画面用） */
  leading?: ReactNode
  /** 右上の丸いボタン（HeaderAction） */
  actions?: ReactNode
}) {
  return (
    <header className="fitall-header">
      <div className="fitall-header-side">
        {back ? (
          <Link href={back.href} aria-label={back.label} className="fitall-circle-button">
            <span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </span>
          </Link>
        ) : leading}
      </div>
      <div className="fitall-header-center">
        <h1 className="fitall-header-title">{title}</h1>
        {subtitle ? <p className="fitall-header-sub">{subtitle}</p> : null}
      </div>
      <div className="fitall-header-side" data-side="end">{actions}</div>
    </header>
  )
}

// 見出し左右の丸いボタン。tone="ink" で主要操作として黒くする
export function HeaderAction({ href, label, tone, children }: {
  href: string
  label: string
  tone?: 'ink'
  children: ReactNode
}) {
  return (
    <Link href={href} aria-label={label} title={label} className="fitall-circle-button" data-tone={tone}>
      <span>{children}</span>
    </Link>
  )
}

// 開発用確認モードであることを控えめに伝える
export function DevPreviewNote({ children }: { children: ReactNode }) {
  return <p role="note" className="fitall-dev-note">{children}</p>
}
