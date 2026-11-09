// 新UIで使う記号。iPhoneの記号（SF Symbols）に近い細さと形で描く

type IconProps = { size?: number; className?: string }

export function ChevronRight({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

export function ChevronLeft({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 4.5 7.5 12l7.5 7.5" />
    </svg>
  )
}

export function Plus({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function Close({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function Check({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  )
}

// 下部タブの記号。選択中は塗りつぶす
function TabSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg width="27" height="27" viewBox="0 0 24 24" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export function TabHome({ active }: { active: boolean }) {
  return (
    <TabSvg>
      <path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.6H9.2v5.6H5A1.5 1.5 0 0 1 3.5 19Z" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
    </TabSvg>
  )
}

export function TabCalendar({ active }: { active: boolean }) {
  return (
    <TabSvg>
      <rect x="3" y="4.5" width="18" height="16.5" rx="3.5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
      <path d="M8 2.5v4M16 2.5v4" fill="none" stroke="currentColor" />
      <path d="M3 9.5h18" fill="none" stroke={active ? '#FFFFFF' : 'currentColor'} />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" fill="none" stroke={active ? '#FFFFFF' : 'currentColor'} strokeWidth="2.4" />
    </TabSvg>
  )
}

export function TabTicket({ active }: { active: boolean }) {
  return (
    <TabSvg>
      <path d="M3.5 7.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v2.6a2 2 0 0 0 0 3.8v2.6a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-2.6a2 2 0 0 0 0-3.8Z" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
      <path d="M14.5 6v2M14.5 11v2M14.5 16v2" fill="none" stroke={active ? '#FFFFFF' : 'currentColor'} />
    </TabSvg>
  )
}

export function TabPerson({ active }: { active: boolean }) {
  return (
    <TabSvg>
      <circle cx="12" cy="8" r="4" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
      <path d="M4.5 20.5c0-4 3.4-6.8 7.5-6.8s7.5 2.8 7.5 6.8Z" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
    </TabSvg>
  )
}

export function TabPeople({ active }: { active: boolean }) {
  return (
    <TabSvg>
      <circle cx="9" cy="8" r="3.6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
      <path d="M2.5 20c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2Z" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
      <path d="M15.5 4.7a3.4 3.4 0 0 1 0 6.6M17.5 13.9c2.4.6 4 2.9 4 6.1" fill="none" stroke="currentColor" />
    </TabSvg>
  )
}

export function TabChart({ active }: { active: boolean }) {
  return (
    <TabSvg>
      <rect x="3.5" y="12" width="4" height="8.5" rx="1.2" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
      <rect x="10" y="7.5" width="4" height="13" rx="1.2" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
      <rect x="16.5" y="3.5" width="4" height="17" rx="1.2" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
    </TabSvg>
  )
}

export function TabSend({ active }: { active: boolean }) {
  return (
    <TabSvg>
      <path d="M21 3 3.5 10.4l7 2.6 2.6 7Z" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
      <path d="M21 3 10.5 13" fill="none" stroke={active ? '#FFFFFF' : 'currentColor'} />
    </TabSvg>
  )
}

export function Gear({ size = 23 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.8 1.17V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-2.8-1.17l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3 14H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8.2l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 10 4.09V4a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 2.8 1.17l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 21 10h.09a2 2 0 1 1 0 4H21a1.65 1.65 0 0 0-1.6 1Z" />
    </svg>
  )
}

export function Search({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function LinkIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </svg>
  )
}

export function Copy({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="3" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  )
}
