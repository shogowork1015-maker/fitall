'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function HomeIcon({ active }: { active: boolean }) {
  const color = active ? '#0A0A0A' : '#A8B2B2'
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  )
}

function CalendarIcon({ active }: { active: boolean }) {
  const color = active ? '#0A0A0A' : '#A8B2B2'
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  )
}

function TicketIcon({ active }: { active: boolean }) {
  const color = active ? '#0A0A0A' : '#A8B2B2'
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4Z" />
      <path d="M13 5v14" />
    </svg>
  )
}

function LineIcon({ active }: { active: boolean }) {
  const color = active ? '#0A0A0A' : '#A8B2B2'
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-8 8H9l-5 2 1.5-4A8 8 0 1 1 21 12Z" />
      <path d="M8 12h.01" />
      <path d="M12 12h.01" />
      <path d="M16 12h.01" />
    </svg>
  )
}

const tabs = [
  { href: '/customer/app', label: 'ホーム', Icon: HomeIcon, exact: true },
  { href: '/customer/app/bookings', label: '予約', Icon: CalendarIcon },
  { href: '/customer/app/tickets', label: 'チケット', Icon: TicketIcon },
  { href: '/customer/app/mypage', label: 'マイページ', Icon: LineIcon },
]

export function CustomerTabNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto grid h-[86px] max-w-[430px] grid-cols-4 border-t-2 border-[#DDE8E8] bg-white pb-5 pt-2 md:left-1/2 md:-translate-x-1/2">
      {tabs.map(({ href, label, Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex flex-col items-center justify-center gap-1 text-[10px] font-black ${
              active ? 'text-[#0A0A0A]' : 'text-[#A8B2B2]'
            }`}
          >
            {active && <span className="absolute -top-2 h-1 w-8 bg-[#12C7BE]" />}
            <Icon active={active} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
