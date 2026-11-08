'use client'

import { signOutAction } from '@/app/auth/login/actions'
import { BottomTabBar } from '@/components/ui/BottomTabBar'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// 下部タブのアイコン。iPhoneと同じく、選択中は塗りつぶし・それ以外は線で描く
function TabSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

function DashboardIcon({ active }: { active: boolean }) {
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

function WalletIcon({ active }: { active: boolean }) {
  return (
    <TabSvg>
      <rect x="3.5" y="12" width="4" height="8.5" rx="1.2" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
      <rect x="10" y="7.5" width="4" height="13" rx="1.2" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
      <rect x="16.5" y="3.5" width="4" height="17" rx="1.2" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
    </TabSvg>
  )
}

function UsersIcon({ active }: { active: boolean }) {
  return (
    <TabSvg>
      <circle cx="9" cy="8" r="3.6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
      <path d="M2.5 20c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2Z" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
      <path d="M15.5 4.7a3.4 3.4 0 0 1 0 6.6M17.5 13.9c2.4.6 4 2.9 4 6.1" fill="none" stroke="currentColor" />
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

function LinkIcon({ active }: { active: boolean }) {
  return (
    <TabSvg>
      <path d="M21 3 3.5 10.4l7 2.6 2.6 7Z" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
      <path d="M21 3 10.5 13" fill="none" stroke={active ? '#ffffff' : 'currentColor'} />
    </TabSvg>
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
                className={`grid h-11 grid-cols-[28px_1fr] items-center gap-3 rounded-control px-3 font-bold ${
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
          <Link href="/trainer/settings" className="flex h-11 items-center rounded-control px-3 font-bold text-ink-muted hover:bg-surface-soft">
            設定
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="grid h-11 w-full grid-cols-[28px_1fr] items-center gap-3 rounded-control px-3 text-left font-bold text-ink-muted hover:bg-surface-soft"
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
