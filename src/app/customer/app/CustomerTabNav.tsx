'use client'

import { TabBar, type Tab } from '@/ui/TabBar'
import { TabCalendar, TabHome, TabPerson, TabTicket } from '@/ui/icons'

const tabs: Tab[] = [
  { href: '/customer/app', label: 'ホーム', Icon: TabHome, exact: true },
  { href: '/customer/app/bookings/list', label: '予約', Icon: TabCalendar, match: ['/customer/app/bookings'] },
  { href: '/customer/app/tickets', label: 'チケット', Icon: TabTicket },
  { href: '/customer/app/mypage', label: 'マイページ', Icon: TabPerson },
]

export function CustomerTabNav() {
  return <TabBar tabs={tabs} label="メインメニュー" />
}
