import Link from 'next/link'
import type { ReactNode } from 'react'
import s from './ui.module.css'

type Variant = 'primary' | 'aqua' | 'secondary' | 'destructive'

// ボタン。primary（黒）は1画面に1つだけ。aqua は黒い面の上の主な操作に使う
export function Button({ variant = 'primary', size = 'large', href, external = false, type = 'button', disabled, onClick, children }: {
  variant?: Variant
  size?: 'large' | 'medium' | 'small'
  href?: string
  external?: boolean
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  if (href && external) {
    return <a href={href} target="_blank" rel="noreferrer" className={s.button} data-variant={variant} data-size={size}>{children}</a>
  }
  if (href) {
    return (
      <Link href={href} className={s.button} data-variant={variant} data-size={size} aria-disabled={disabled}>
        {children}
      </Link>
    )
  }
  return (
    <button type={type} className={s.button} data-variant={variant} data-size={size} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}

// ボタンを縦（または2列）に並べる
export function Buttons({ columns = 1, children }: { columns?: 1 | 2; children: ReactNode }) {
  return <div className={s.buttons} data-columns={columns}>{children}</div>
}

// 文字だけのボタン
export function PlainButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button type="button" className={s.plainButton} onClick={onClick}>{children}</button>
}
