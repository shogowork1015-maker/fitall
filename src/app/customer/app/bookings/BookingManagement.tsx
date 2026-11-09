'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatJstDate, formatJstDateKey, formatJstDateTime, formatJstTime } from '@/lib/datetime'
import type { PublicBookingSlot } from '@/lib/public-booking'
import type { CustomerBooking } from '@/lib/customer-app'
import { changeCustomerBooking, loadBookingChangeSlots } from './manage-actions'
import { Section, Row, statusText, Empty } from '@/ui/List'
import { Button } from '@/ui/Button'
import s from '@/ui/ui.module.css'
import { Week } from '@/ui/Week'

// 予約の詳細シートの中身。日時の変更とキャンセル（開始24時間前まで）
export function BookingManagement({ booking, enabled = true, loadSlots = loadBookingChangeSlots, changeBooking = changeCustomerBooking, onSuccess }: {
  booking: CustomerBooking
  enabled?: boolean
  loadSlots?: typeof loadBookingChangeSlots
  changeBooking?: typeof changeCustomerBooking
  onSuccess?: (message: string) => void
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'view' | 'move' | 'cancel'>('view')
  const [slots, setSlots] = useState<PublicBookingSlot[]>([])
  const [dayKey, setDayKey] = useState('')
  const [selected, setSelected] = useState('')
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const deadline = new Date(Date.parse(booking.scheduled_at) - 86400000)
  const [withinDeadline] = useState(() => Date.now() <= deadline.getTime())
  const active = ['confirmed', 'pending'].includes(booking.status)
  const longDate = (value: string | Date) => formatJstDateTime(value, { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })

  function startMove() {
    setMode('move'); setMessage(''); setSelected(''); setSlots([])
    startTransition(async () => {
      const result = await loadSlots(booking.id)
      setSlots(result.slots)
      setDayKey(result.slots[0] ? formatJstDateKey(result.slots[0].value) : '')
      if (result.error) setMessage(result.error)
    })
  }

  function submit() {
    startTransition(async () => {
      const result = await changeBooking({ bookingId: booking.id, expectedAt: booking.scheduled_at, ...(mode === 'move' ? { newAt: selected } : {}) })
      setMessage(result.message)
      if (result.status === 'success') { onSuccess?.(result.message); router.refresh() }
    })
  }

  // 変更先の候補を日ごとにまとめる
  const dayKeys = [...new Set(slots.map((slot) => formatJstDateKey(slot.value)))]
  const daySlots = slots.filter((slot) => formatJstDateKey(slot.value) === dayKey)

  return (
    <div aria-busy={pending}>
      <Section group header="予約">
        <Row title="日時" value={longDate(booking.scheduled_at)} strongValue />
        <Row title="状態" value={statusText(booking.status)} />
      </Section>

      {message ? <p role="status" style={{ fontSize: 15, lineHeight: 1.5, margin: '16px 4px 0' }}>{message}</p> : null}

      {active && mode === 'view' ? (
        enabled && withinDeadline ? (
          <Section footer={`変更・キャンセルは ${longDate(deadline)} までできます。`}>
            <div className={s.buttons} style={{ marginTop: 0 }}>
              <Button variant="secondary" onClick={startMove}>日時を変更する</Button>
              <Button variant="destructive" onClick={() => { setMode('cancel'); setMessage('') }}>予約をキャンセル</Button>
            </div>
          </Section>
        ) : (
          <p style={{ color: 'var(--ui-label-2)', fontSize: 15, lineHeight: 1.5, margin: '16px 4px 8px' }}>
            {enabled ? '開始24時間前を過ぎています。変更・キャンセルはトレーナーへご連絡ください。' : '確認モードのため、変更・キャンセルはできません。'}
          </p>
        )
      ) : null}

      {mode === 'move' ? (
        <>
          <Section header="変更先の日付">
            {pending && !slots.length ? <Empty>空き時間を確認しています…</Empty> : dayKeys.length ? (
              <Week
                scroll
                label="変更先の日付"
                days={dayKeys.map((key) => {
                  const date = new Date(`${key}T00:00:00+09:00`)
                  return { key, weekday: formatJstDate(date, { weekday: 'short' }), day: Number(key.slice(8, 10)) }
                })}
                selected={dayKey}
                onSelect={(key) => { setDayKey(key); setSelected('') }}
              />
            ) : <Empty>変更できる空き時間がありません</Empty>}
          </Section>
          {daySlots.length ? (
            <Section header="時間" footer="チケットの追加消費はありません。">
              <div className={s.slots}>
                {daySlots.map((slot) => (
                  <button key={slot.value} type="button" className={s.slotButton} aria-pressed={slot.value === selected} onClick={() => setSelected(slot.value)}>
                    {formatJstTime(slot.value)}
                  </button>
                ))}
              </div>
            </Section>
          ) : null}
          <Section>
            <div className={s.buttons} style={{ marginTop: 0 }}>
              <Button disabled={pending || !selected} onClick={submit}>{pending ? '変更しています…' : selected ? `${longDate(selected)}に変更` : '時間を選んでください'}</Button>
              <Button variant="secondary" disabled={pending} onClick={() => { setMode('view'); setMessage('') }}>やめる</Button>
            </div>
          </Section>
        </>
      ) : null}

      {mode === 'cancel' ? (
        <Section footer="チケット1回分を返却します。有効期限は延長されません。購入代金の返金はありません。">
          <div className={s.buttons} style={{ marginTop: 0 }}>
            <Button variant="destructive" disabled={pending} onClick={submit}>{pending ? 'キャンセルしています…' : 'キャンセルを確定する'}</Button>
            <Button variant="secondary" disabled={pending} onClick={() => { setMode('view'); setMessage('') }}>やめる</Button>
          </div>
        </Section>
      ) : null}
    </div>
  )
}
