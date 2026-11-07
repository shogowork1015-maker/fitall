'use client'

import { signOutAction } from '@/app/auth/login/actions'
import { BottomTabBar } from '@/components/ui/BottomTabBar'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function DashboardIcon({ active }: { active: boolean }) {
  const c = 'currentColor'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function WalletIcon({ active }: { active: boolean }) {
  const c = 'currentColor'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  )
}

function UsersIcon({ active }: { active: boolean }) {
  const c = 'currentColor'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function CalendarIcon({ active }: { active: boolean }) {
  const c = 'currentColor'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  )
}

function LinkIcon({ active }: { active: boolean }) {
  const c = 'currentColor'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

const tabs = [
  { href: '/trainer/dashboard', label: 'ホーム', Icon: DashboardIcon },
  { href: '/trainer/bookings', label: '予約', Icon: CalendarIcon },
  { href: '/trainer/clients', label: 'お客様', Icon: UsersIcon },
  { href: '/trainer/sales', label: '売上', Icon: WalletIcon },
  { href: '/trainer/invite', label: '招待', Icon: LinkIcon },
]

export function TrainerTabNav() {
  const pathname = usePathname()

  if (pathname === '/trainer/portal') {
    return null
  }

  return (
    <>
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:w-[260px] md:flex-col md:border-r md:border-line md:bg-white">
        <div className="border-b border-line px-6 py-6">
          <p className="text-2xl font-black text-ink">Limitless</p>
        </div>
        <nav className="flex flex-1 flex-col gap-2 px-4 py-5">
          {tabs.map(({ href, label, Icon }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`grid h-14 grid-cols-[28px_1fr] items-center gap-3 rounded-control px-3 font-bold ${
                  isActive
                    ? 'bg-accent-soft text-ink'
                    : 'text-ink-muted hover:bg-surface-soft'
                }`}
              >
                <Icon active={isActive} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="space-y-2 border-t border-line px-4 py-4">
          <Link href="/trainer/settings" className="flex h-14 items-center rounded-control px-3 font-bold text-ink-muted hover:bg-surface-soft">
            設定
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="grid h-14 w-full grid-cols-[28px_1fr] items-center gap-3 rounded-control px-3 text-left font-bold text-ink-muted hover:bg-surface-soft"
            >
              <LogoutIcon />
              <span>ログアウト</span>
            </button>
          </form>
        </div>
      </aside>

      <BottomTabBar tabs={tabs} label="メインメニュー" className="shrink-0 md:hidden" />
    </>
  )
}
