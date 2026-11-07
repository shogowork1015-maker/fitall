'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CustomerBookingList } from '@/app/customer/app/bookings/CustomerBookingList'
import { CustomerHome } from '@/app/customer/app/CustomerHome'
import { CustomerWeekCalendar, type TicketBookingAction } from '@/app/customer/app/bookings/CustomerWeekCalendar'
import { TicketPurchaseForm, type TicketCheckoutAction } from '@/app/customer/app/tickets/TicketPurchaseForm'
import type { CustomerAppData, CustomerBooking } from '@/lib/customer-app'
import type { PublicBookingData } from '@/lib/public-booking'
import { customerAvailability } from '@/lib/customer-availability'
import { formatJstDateKey } from '@/lib/datetime'

type View = 'home' | 'booking' | 'list' | 'tickets'
export function TicketFlowPreview({ source, empty = false, fail = false }: { source: PublicBookingData; empty?: boolean; fail?: boolean }) {
  const [view, setView] = useState<View>('home')
  const [remaining, setRemaining] = useState(empty ? 0 : 3)
  const [purchased, setPurchased] = useState(empty ? 0 : 8)
  const [bookings, setBookings] = useState<CustomerBooking[]>(() => empty ? [] :
    source.slots.filter((_, index) => index === 1 || index === 10).map(slot => ({
      id: `sample-${slot.value}`, scheduled_at: slot.value, status: 'confirmed', price: 0, title: '予約確定',
    }))
  )
  const [notice, setNotice] = useState('')
  const available = source.slots.filter(slot => !bookings.some(booking => booking.scheduled_at === slot.value))
  const data: Pick<CustomerAppData, 'customer' | 'trainer' | 'tickets' | 'upcomingBookings'> = {
    customer: { id: 'sample', name: 'サンプル', email: '', goal: '', lineUserId: null },
    trainer: source.trainer,
    tickets: purchased ? [{ id: 'sample', title: '4回チケット', kind: 'ticket', remaining, scheduled: bookings.length, used: Math.max(0, purchased - remaining - bookings.length), total: purchased, expiresLabel: '有効期限なし（サンプル）', note: '' }] : [],
    upcomingBookings: [...bookings].sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at)),
  }
  const book: TicketBookingAction = async (_previous, formData) => {
    await new Promise(resolve => setTimeout(resolve, 600))
    if (fail) return { status: 'error', message: 'この日時は直前に埋まりました。別の日時を選んでください。' }
    const value = String(formData.get('scheduled_at') ?? '')
    if (remaining <= 0) return { status: 'error', needsPurchase: true, message: '使えるチケットがありません。' }
    if (!available.some(slot => slot.value === value)) return { status: 'error', message: '別の日時を選んでください。' }
    setRemaining(count => count - 1)
    setBookings(items => [...items, { id: value, scheduled_at: value, status: 'confirmed', price: 0, title: '予約確定' }])
    return { status: 'success', message: '画面内で予約を確認しました。実際の予約・通知は行っていません。' }
  }
  const purchase: TicketCheckoutAction = async () => {
    await new Promise(resolve => setTimeout(resolve, 600))
    setRemaining(count => count + 4)
    setPurchased(count => count + 4)
    setNotice('プレビューでチケットを4枚追加しました。決済は行っていません。')
    return null
  }
  return <div className="mx-auto min-h-screen w-full max-w-[430px] bg-white" onClickCapture={event => {
    const anchor = (event.target as Element).closest('a')
    const next: Record<string, View> = { '/customer/app': 'home', '/customer/app/bookings': 'booking', '/customer/app/bookings/list': 'list', '/customer/app/tickets': 'tickets' }
    const target = anchor?.getAttribute('href')
    if (target && next[target]) { event.preventDefault(); setView(next[target]); setNotice(''); window.scrollTo({ top: 0 }) }
  }}>
    <p className="bg-accent-soft p-3 text-center text-base font-bold text-brand">開発プレビュー · サンプル表示 · 保存・決済・通知なし</p>
    {view === 'home' && <CustomerHome data={data} />}
    {view === 'list' && <CustomerBookingList upcomingBookings={data.upcomingBookings} />}
    {view === 'booking' && <main className="pb-24">
      <header className="px-4 pt-6"><h1 className="text-2xl font-black">チケットで予約</h1><p className="mt-3 text-base">使えるチケット <strong>{remaining}枚</strong></p></header>
      <CustomerWeekCalendar availability={customerAvailability(available, formatJstDateKey(source.slots[0]?.value ?? new Date()))}
        availableTicketCount={remaining} bookingAction={book} preview />
    </main>}
    {view === 'tickets' && <main className="px-4 pt-6 pb-24">
      <h1 className="text-2xl font-black">チケット</h1><p className="mt-3 text-base">使えるチケット <strong>{remaining}枚</strong></p>
      {notice && <p role="status" className="mt-4 bg-accent-soft p-3 text-base">{notice}</p>}
      {remaining > 0 && <Link href="/customer/app/bookings" className="fitall-primary-action mt-4 h-12">チケットで予約する</Link>}
      <section className="mt-7 border-t-2 border-ink pt-5"><h2 className="text-base font-black">メニューを購入</h2>
        <div className="my-4 flex items-center justify-between"><div><h3 className="font-bold">4回チケット</h3><p className="mt-2 text-base text-ink-muted">購入後、好きな日時に予約できます</p></div><strong>¥28,000</strong></div>
        <TicketPurchaseForm planId="preview-four" checkoutAction={purchase} preview />
      </section>
    </main>}
    <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-[430px] border-t border-line bg-white" aria-label="お客様メニュー">
      {([['home', '/customer/app', 'ホーム'], ['list', '/customer/app/bookings/list', '予約'], ['tickets', '/customer/app/tickets', 'チケット']] as const).map(([key, href, label]) =>
        <Link key={key} href={href} aria-current={(view === key || (key === 'list' && view === 'booking')) ? 'page' : undefined} className={`flex h-16 flex-1 items-center justify-center text-base font-medium ${(view === key || (key === 'list' && view === 'booking')) ? 'text-brand bg-accent-soft' : 'text-ink-muted'}`}>{label}</Link>)}
    </nav>
  </div>
}
