'use client'

import { BottomTabBar } from '@/components/ui/BottomTabBar'

// 下部タブのアイコン。iPhoneと同じく、選択中は塗りつぶし・それ以外は線で描く
function TabSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <TabSvg>
      <path
        d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.6H9.2v5.6H5A1.5 1.5 0 0 1 3.5 19Z"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
      />
    </TabSvg>
  )
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <TabSvg>
      <rect x="3" y="4.5" width="18" height="16.5" rx="3.5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
      <path d="M8 2.5v4M16 2.5v4" fill="none" stroke="currentColor" />
      <path d="M3 9.5h18" fill="none" stroke={active ? '#ffffff' : 'currentColor'} />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" fill="none" stroke={active ? '#ffffff' : 'currentColor'} strokeWidth="2.4" />
    </TabSvg>
  )
}

function TicketIcon({ active }: { active: boolean }) {
  return (
    <TabSvg>
      <path
        d="M3.5 7.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v2.6a2 2 0 0 0 0 3.8v2.6a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-2.6a2 2 0 0 0 0-3.8Z"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
      />
      <path d="M14.5 6v2M14.5 11v2M14.5 16v2" fill="none" stroke={active ? '#ffffff' : 'currentColor'} />
    </TabSvg>
  )
}

function PersonIcon({ active }: { active: boolean }) {
  return (
    <TabSvg>
      <circle cx="12" cy="8" r="4" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
      <path d="M4.5 20.5c0-4 3.4-6.8 7.5-6.8s7.5 2.8 7.5 6.8Z" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
    </TabSvg>
  )
}

const tabs = [
  { href: '/customer/app', label: 'ホーム', Icon: HomeIcon, exact: true },
  { href: '/customer/app/bookings/list', label: '予約', Icon: CalendarIcon, matchPrefix: '/customer/app/bookings' },
  { href: '/customer/app/tickets', label: 'チケット', Icon: TicketIcon },
  { href: '/customer/app/mypage', label: 'マイページ', Icon: PersonIcon },
]

export function CustomerTabNav() {
  return <BottomTabBar tabs={tabs} label="メインメニュー" fixed />
}
