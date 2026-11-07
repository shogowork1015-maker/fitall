'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CustomerAvailabilityDay } from '@/lib/customer-app'
import type { CustomerBookingActionState } from './actions'
import { BookingSlotPicker } from '@/components/BookingSlotPicker'
import { formatJstDateTime } from '@/lib/datetime'

export type TicketBookingAction = (state: CustomerBookingActionState, data: FormData) => Promise<CustomerBookingActionState>

export function CustomerWeekCalendar({ availability, availableTicketCount, bookingAction, preview = false }: {
  availability: CustomerAvailabilityDay[]; availableTicketCount: number; bookingAction?: TicketBookingAction; preview?: boolean
}) {
  const router = useRouter()
  const [selected, setSelected] = useState('')
  const submitting = useRef(false)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const [state, action, pending] = useActionState<CustomerBookingActionState, FormData>(async (previous, formData) => {
    try {
      const result = bookingAction ? await bookingAction(previous, formData) : { status: 'error' as const, message: 'この画面からは予約できません。' }
      if (result?.status !== 'success') submitting.current = false
      return result
    } catch {
      submitting.current = false
      return { status: 'error', message: '予約結果を確認できませんでした。予約一覧を確認してから、もう一度お試しください。' }
    }
  }, null)
  const slots = availability.flatMap(day => day.cells.filter(cell => cell.status === 'open' && cell.value).map(cell => ({ value: cell.value!, label: cell.availableLabel ?? cell.time })))
  const chosen = slots.find(slot => slot.value === selected)
  const needsPurchase = availableTicketCount <= 0 || (state?.status === 'error' && state.needsPurchase)
  const success = state?.status === 'success'
  useEffect(() => {
    if (state?.status === 'success' && !preview) router.refresh()
    if (state?.status === 'error') errorRef.current?.focus()
  }, [state, router, preview])

  if (success) return <section className="p-5" role="status">
    <p className="text-xs font-bold text-[#087D78]">{preview ? 'プレビューでの予約完了' : '予約完了'}</p>
    <h2 className="mt-2 text-xl font-black">{formatJstDateTime(selected, { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}</h2>
    <p className="mt-3 text-sm leading-relaxed">{state.message}</p>
    <p className="mt-2 text-sm">チケット1枚を予約に使用しました。</p>
    <Link href="/customer/app" className="fitall-primary-action mt-5 h-12">ホームに戻る</Link>
  </section>

  return <form action={action} className="p-4" onSubmit={event => {
    if (!chosen || needsPurchase || submitting.current) { event.preventDefault(); return }
    submitting.current = true
  }} aria-busy={pending}>
    <input type="hidden" name="scheduled_at" value={chosen?.value ?? ''} />
    <BookingSlotPicker slots={slots} value={selected} onChange={setSelected} disabled={pending} />
    <section className="mt-5 border-t-2 border-[#0A0A0A] pt-4" aria-label="予約内容の確認">
      <h3 className="text-sm font-black">{chosen ? formatJstDateTime(chosen.value, { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }) : '予約する時間を選んでください'}</h3>
      <div className="mt-3 flex items-baseline justify-between text-sm"><span>使用するチケット</span><strong>1枚</strong></div>
      {!needsPurchase && <p className="mt-2 text-xs text-[#555555]">予約後の残り {Math.max(0, availableTicketCount - 1)}枚 · 追加のお支払いはありません</p>}
    </section>
    {state?.status === 'error' && <p ref={errorRef} tabIndex={-1} role="alert" className="mt-4 bg-[#FEF2F2] p-3 text-sm text-[#A0102B]">{state.message}</p>}
    {needsPurchase ? <div className="mt-4">
      <p className="mb-3 text-sm">使えるチケットがありません。</p>
      <Link href="/customer/app/tickets" className="fitall-primary-action h-12">チケットを購入する</Link>
    </div> : <button type="submit" disabled={pending || !chosen} className="fitall-primary-action mt-4 h-14 w-full disabled:cursor-not-allowed disabled:opacity-40">
      {pending ? '予約しています…' : 'チケット1枚で予約する'}
    </button>}
  </form>
}
