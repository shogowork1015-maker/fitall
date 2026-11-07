'use client'
import { useState } from 'react'
import { BookingManagement } from '@/app/customer/app/bookings/BookingManagement'
import { formatJstDateTime } from '@/lib/datetime'
import type { PublicBookingSlot } from '@/lib/public-booking'

export function BookingManagementPreview({ slots, late, fail }: { slots: PublicBookingSlot[]; late: boolean; fail: boolean }) {
  const [booking, setBooking] = useState(() => ({ id: 'preview-management', scheduled_at: late ? new Date(Date.now() + 3600000).toISOString() : slots[slots.length - 1].value, status: 'confirmed', price: 0, title: 'レッスン' }))
  const [remaining, setRemaining] = useState(3)
  return <main className="mx-auto min-h-screen max-w-[430px] bg-white px-4 py-6 text-ink">
    <p className="text-base text-brand">開発プレビュー · サンプルのみ · DB・決済・通知への操作なし</p>
    <h1 className="mt-6 text-2xl font-black">予約の変更・キャンセル</h1>
    <p className="mt-6">使えるチケット：{remaining}枚</p>
    <p className="mt-6 text-lg font-bold">{formatJstDateTime(booking.scheduled_at, { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    <p className="mt-2">{booking.status === 'cancelled' ? 'キャンセル済み · チケット1枚を返却しました' : '予約確定'}</p>
    <BookingManagement key={`${booking.scheduled_at}-${booking.status}`} booking={booking}
      loadSlots={async () => ({ slots: slots.filter(s => Date.parse(s.value) >= Date.now() + 86400000 && s.value !== booking.scheduled_at) })}
      changeBooking={async input => {
        if (fail) return { status: 'error', message: 'この日時は直前に埋まりました。元の予約はそのままです。別の日時を選んでください。' }
        setBooking(b => ({ ...b, scheduled_at: input.newAt ?? b.scheduled_at, status: input.newAt ? b.status : 'cancelled' }))
        if (!input.newAt) setRemaining(n => n + 1)
        return { status: 'success', message: input.newAt ? '予約日時を変更しました。チケットの追加消費はありません。' : 'キャンセルしました。チケット1枚を返却しました。' }
      }} />
  </main>
}
