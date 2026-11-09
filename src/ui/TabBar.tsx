'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { CSSProperties, ComponentType } from 'react'
import s from './ui.module.css'

export type Tab = {
  href: string
  label: string
  Icon: ComponentType<{ active: boolean }>
  /** このパスで始まる画面でも選択中にする */
  match?: string[]
  exact?: boolean
}

export function isTabActive(tab: Tab, pathname: string) {
  if (tab.exact) return pathname === tab.href
  return [tab.href, ...(tab.match ?? [])].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

// 下部タブ。iPhoneと同じく文字10pt、選択中だけ塗りつぶしの記号
export function TabBar({ tabs, label, mobileOnly = false }: { tabs: Tab[]; label: string; mobileOnly?: boolean }) {
  const pathname = usePathname()
  const isActive = (tab: Tab) => isTabActive(tab, pathname)
  return (
    <nav aria-label={label} className={s.tabbar} data-mobile-only={mobileOnly} style={{ '--count': tabs.length } as CSSProperties}>
      {tabs.map((tab) => {
        const active = isActive(tab)
        return (
          <Link key={tab.href} href={tab.href} className={s.tab} aria-current={active ? 'page' : undefined}>
            <tab.Icon active={active} />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
