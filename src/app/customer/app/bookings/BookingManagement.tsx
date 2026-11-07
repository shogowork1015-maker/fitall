'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BookingSlotPicker } from '@/components/BookingSlotPicker'
import { formatJstDateTime } from '@/lib/datetime'
import type { PublicBookingSlot } from '@/lib/public-booking'
import type { CustomerBooking } from '@/lib/customer-app'
import { changeCustomerBooking, loadBookingChangeSlots } from './manage-actions'

export function BookingManagement({ booking, loadSlots = loadBookingChangeSlots, changeBooking = changeCustomerBooking, onSuccess }: {
  booking: CustomerBooking; loadSlots?: typeof loadBookingChangeSlots; changeBooking?: typeof changeCustomerBooking; onSuccess?: (message: string) => void
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'closed' | 'move' | 'cancel'>('closed')
  const [slots, setSlots] = useState<PublicBookingSlot[]>([])
  const [selected, setSelected] = useState('')
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()
  const deadline = new Date(Date.parse(booking.scheduled_at) - 86400000)
  const [withinDeadline] = useState(() => Date.now() <= deadline.getTime())
  const format = (value: string | Date) => formatJstDateTime(value, { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })
  if (!['confirmed', 'pending'].includes(booking.status)) return null
  function move() {
    setMode('move'); setMessage(''); setSelected(''); setSlots([])
    startTransition(async () => {
      const result = await loadSlots(booking.id)
      setSlots(result.slots)
      if (result.error) setMessage(result.error)
    })
  }
  function submit() {
    startTransition(async () => {
      const result = await changeBooking({ bookingId: booking.id, expectedAt: booking.scheduled_at,
        ...(mode === 'move' ? { newAt: selected } : {}) })
      setMessage(result.message)
      if (result.status === 'success') { onSuccess?.(result.message); setDone(true); setMode('closed'); router.refresh() }
    })
  }
  return <div className="mt-3">
    {withinDeadline ? <p className="text-ink-muted">変更・キャンセルは {format(deadline)} まで</p>
      : <p className="text-ink-muted">開始24時間前を過ぎています。変更・キャンセルはトレーナーへご連絡ください。</p>}
    {withinDeadline && !done && mode === 'closed' && <div className="mt-3 grid grid-cols-2 gap-2">
      <button type="button" className="fitall-secondary-action" onClick={move}>日時を変更</button>
      <button type="button" className="fitall-secondary-action text-danger" onClick={() => { setMode('cancel'); setMessage('') }}>キャンセル</button>
    </div>}
    {mode !== 'closed' && <div className="fitall-fade mt-3 rounded-control bg-surface-soft p-3" aria-busy={pending}>
      <h3 className="font-bold">{mode === 'move' ? '変更先を選ぶ' : 'この予約をキャンセルしますか？'}</h3>
      {mode === 'move' ? <>
        <p className="mt-2">開始まで24時間以上ある空き枠に変更できます。チケットの追加消費はありません。</p>
        {pending && !slots.length ? <p className="flex items-center gap-2 py-4" role="status"><span aria-hidden="true" className="fitall-spinner" />空き時間を確認中…</p>
          : <BookingSlotPicker slots={slots} value={selected} onChange={setSelected} disabled={pending} />}
        {selected && <p className="mt-3 font-bold">変更後：{format(selected)}</p>}
      </> : <p className="mt-2 leading-relaxed">チケット1枚を返却します。有効期限は延長されません。購入代金の返金は行いません。</p>}
      <div className="mt-4 space-y-2">
        <button type="button" className={`${mode === 'move' ? 'fitall-primary-action' : 'fitall-danger-action w-full'} gap-2 disabled:opacity-50`} disabled={pending || (mode === 'move' && !selected)} onClick={submit}>
          {pending && <span aria-hidden="true" className="fitall-spinner" />}
          {pending ? '処理中…' : mode === 'move' ? 'この日時に変更する' : 'キャンセルを確定する'}
        </button>
        <button type="button" className="fitall-secondary-action w-full" disabled={pending} onClick={() => { setMode('closed'); setMessage('') }}>戻る</button>
      </div>
    </div>}
    {message && <p role="status" className="mt-3 leading-relaxed">{message}</p>}
  </div>
}
