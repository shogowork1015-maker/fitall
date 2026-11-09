'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOutAction } from '@/app/auth/login/actions'
import { TabBar, isTabActive, type Tab } from '@/ui/TabBar'
import { Gear, TabCalendar, TabChart, TabHome, TabPeople, TabSend } from '@/ui/icons'
import s from '@/ui/ui.module.css'

const tabs: Tab[] = [
  { href: '/trainer/dashboard', label: 'ホーム', Icon: TabHome },
  { href: '/trainer/bookings', label: '予約', Icon: TabCalendar, match: ['/trainer/availability'] },
  { href: '/trainer/clients', label: 'お客様', Icon: TabPeople },
  { href: '/trainer/sales', label: '売上', Icon: TabChart },
  { href: '/trainer/invite', label: '招待', Icon: TabSend },
]

// トレーナー画面の移動。スマホは下部タブ、PCは左のサイドバー（iPadのサイドバーと同じ形）
export function TrainerTabNav() {
  const pathname = usePathname()
  if (pathname === '/trainer/portal') return null

  return (
    <>
      <aside className={s.sidebar} aria-label="メインメニュー">
        <span className={`${s.wordmark} ${s.sidebarBrand}`}>Limitless</span>
        {tabs.map((tab) => {
          const active = isTabActive(tab, pathname)
          return (
            <Link key={tab.href} href={tab.href} className={s.sideItem} aria-current={active ? 'page' : undefined}>
              <tab.Icon active={active} />
              <span>{tab.label}</span>
            </Link>
          )
        })}
        <div className={s.sideFoot}>
          <Link href="/trainer/settings" className={s.sideItem} aria-current={pathname.startsWith('/trainer/settings') ? 'page' : undefined}>
            <Gear size={24} />
            <span>設定</span>
          </Link>
          <form action={signOutAction}>
            <button type="submit" className={s.sideItem}>ログアウト</button>
          </form>
        </div>
      </aside>
      <TabBar tabs={tabs} label="メインメニュー" mobileOnly />
    </>
  )
}
