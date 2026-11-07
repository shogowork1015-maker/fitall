'use client'

import { BottomTabBar } from '@/components/ui/BottomTabBar'

function HomeIcon({ active }: { active: boolean }) {
  const color = 'currentColor'
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? 2.6 : 2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  )
}

function CalendarIcon({ active }: { active: boolean }) {
  const color = 'currentColor'
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? 2.6 : 2.2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  )
}

function TicketIcon({ active }: { active: boolean }) {
  const color = 'currentColor'
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? 2.6 : 2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4Z" />
      <path d="M13 5v14" />
    </svg>
  )
}

function LineIcon({ active }: { active: boolean }) {
  const color = 'currentColor'
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? 2.6 : 2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-8 8H9l-5 2 1.5-4A8 8 0 1 1 21 12Z" />
      <path d="M8 12h.01" />
      <path d="M12 12h.01" />
      <path d="M16 12h.01" />
    </svg>
  )
}

const tabs = [
  { href: '/customer/app', label: 'ホーム', Icon: HomeIcon, exact: true },
  { href: '/customer/app/bookings/list', label: '予約', Icon: CalendarIcon, matchPrefix: '/customer/app/bookings' },
  { href: '/customer/app/tickets', label: 'チケット', Icon: TicketIcon },
  { href: '/customer/app/mypage', label: 'マイページ', Icon: LineIcon },
]

export function CustomerTabNav() {
  return <BottomTabBar tabs={tabs} label="メインメニュー" fixed />
}
