'use client'

import { signOutAction } from '@/app/auth/login/actions'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function DashboardIcon({ active }: { active: boolean }) {
  const c = active ? '#0A0A0A' : '#A8B2B2'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function WalletIcon({ active }: { active: boolean }) {
  const c = active ? '#0A0A0A' : '#A8B2B2'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  )
}

function UsersIcon({ active }: { active: boolean }) {
  const c = active ? '#0A0A0A' : '#A8B2B2'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function CalendarIcon({ active }: { active: boolean }) {
  const c = active ? '#0A0A0A' : '#A8B2B2'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  )
}

function LinkIcon({ active }: { active: boolean }) {
  const c = active ? '#0A0A0A' : '#A8B2B2'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A8B2B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

const tabs = [
  { href: '/trainer/dashboard', label: 'ホーム', Icon: DashboardIcon },
  { href: '/trainer/bookings', label: '予約', Icon: CalendarIcon },
  { href: '/trainer/clients', label: '顧客', Icon: UsersIcon },
  { href: '/trainer/sales', label: '売上', Icon: WalletIcon },
  { href: '/trainer/invite', label: 'LINE', Icon: LinkIcon },
]

export function TrainerTabNav() {
  const pathname = usePathname()

  if (pathname === '/trainer/portal') {
    return null
  }

  return (
    <>
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:w-[260px] md:flex-col md:border-r-2 md:border-[#DDE8E8] md:bg-white">
        <div className="border-b-2 border-[#DDE8E8] px-6 py-6">
          <p className="text-[10px] font-black tracking-[0.18em] text-[#087D78]">TRAINER OS</p>
          <h1 className="mt-1 text-2xl font-black text-[#0A0A0A]">Limitless</h1>
        </div>
        <nav className="flex flex-1 flex-col gap-2 px-4 py-5">
          {tabs.map(({ href, label, Icon }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`grid h-12 grid-cols-[28px_1fr] items-center gap-3 rounded-[6px] border-2 px-3 text-sm font-black transition-colors ${
                  isActive
                    ? 'border-[#0A0A0A] bg-[#E8FBFA] text-[#0A0A0A]'
                    : 'border-transparent text-[#555555] hover:border-[#DDE8E8] hover:bg-white'
                }`}
              >
                <Icon active={isActive} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="border-t-2 border-[#DDE8E8] px-6 py-5">
          <p className="text-xs font-bold leading-relaxed text-[#555555]">
            PCでは予約、顧客、売上を広い画面で管理できます。
          </p>
          <form action={signOutAction} className="mt-4">
            <button
              type="submit"
              className="grid h-12 w-full grid-cols-[28px_1fr] items-center gap-3 rounded-[6px] border-2 border-[#DDE8E8] bg-white px-3 text-left text-sm font-black text-[#555555] transition-colors hover:border-[#0A0A0A] hover:bg-[#F4F7F7]"
            >
              <LogoutIcon />
              <span>ログアウト</span>
            </button>
          </form>
        </div>
      </aside>

      <nav className="flex h-[88px] w-full shrink-0 flex-row items-center justify-around border-t-2 border-[#DDE8E8] bg-white pb-6 pt-2 md:hidden">
        {tabs.map(({ href, label, Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex w-16 flex-col items-center justify-center space-y-1 transition-colors ${
                isActive ? 'text-[#0A0A0A]' : 'text-[#A8B2B2]'
              }`}
            >
              {isActive && (
                <span className="absolute -top-2 h-1 w-8 rounded-none bg-[#12C7BE]" />
              )}
              <Icon active={isActive} />
              <span className="text-[10px] font-black">{label}</span>
            </Link>
          )
        })}
        <form action={signOutAction}>
          <button
            type="submit"
            className="relative flex w-16 flex-col items-center justify-center space-y-1 text-[#A8B2B2] transition-colors"
          >
            <LogoutIcon />
            <span className="text-[10px] font-black">退出</span>
          </button>
        </form>
      </nav>
    </>
  )
}
