import Link from 'next/link'
import type { ReactNode } from 'react'

// スマホ画面の見出し。左寄せの大きな題名と、右上の丸いボタンで構成する
export function PageHeader({ title, subtitle, back, actions }: {
  title: string
  subtitle?: ReactNode
  /** 左上の戻るボタン */
  back?: { href: string; label: string }
  /** 右上の丸いボタン（HeaderAction） */
  actions?: ReactNode
}) {
  return (
    <header className="fitall-header" data-bar={back || actions ? 'true' : 'false'}>
      {(back || actions) && <div className="fitall-header-bar">
        {back ? (
          <Link href={back.href} aria-label={back.label} className="fitall-circle-button">
            <span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </span>
          </Link>
        ) : null}
        {actions ? <div className="fitall-header-actions">{actions}</div> : null}
      </div>}
      <h1 className="fitall-large-title">{title}</h1>
      {subtitle ? <p className="fitall-header-sub">{subtitle}</p> : null}
    </header>
  )
}

// 見出し右上の丸いボタン。tone="ink" で主要操作として黒くする
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
