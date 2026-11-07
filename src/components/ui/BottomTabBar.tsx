'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { CSSProperties, ComponentType } from 'react'

export interface BottomTab {
  href: string
  label: string
  Icon: ComponentType<{ active: boolean }>
  /** 完全一致のときだけアクティブにする */
  exact?: boolean
  /** hrefと別のパス配下でもアクティブにしたいとき */
  matchPrefix?: string
}

function isActive(pathname: string, tab: BottomTab) {
  if (tab.exact) return pathname === tab.href
  return pathname.startsWith(tab.matchPrefix ?? tab.href)
}

// 下部タブ。現在地の印は1本の線を滑らせて移動先を分かりやすくする
export function BottomTabBar({ tabs, fixed = false, label, className = '' }: {
  tabs: BottomTab[]
  fixed?: boolean
  label: string
  className?: string
}) {
  const pathname = usePathname()
  const activeIndex = tabs.findIndex(tab => isActive(pathname, tab))
  const style = { '--fitall-tab-count': tabs.length } as CSSProperties

  return (
    <nav aria-label={label} style={style} className={`fitall-tabbar ${fixed ? 'fitall-tabbar-fixed' : ''} ${className}`}>
      {activeIndex >= 0 && (
        <span
          aria-hidden="true"
          className="fitall-tabbar-indicator"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />
      )}
      {tabs.map((tab, index) => {
        const active = index === activeIndex
        return (
          <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined} className="fitall-tab">
            <tab.Icon active={active} />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
