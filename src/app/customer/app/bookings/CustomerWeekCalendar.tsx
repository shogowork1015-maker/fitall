'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CustomerAvailabilityDay } from '@/lib/customer-app'
import type { CustomerBookingActionState } from './actions'
import { formatJstDate, formatJstTime } from '@/lib/datetime'
import { Section, Empty } from '@/ui/List'
import { Button } from '@/ui/Button'
import { Week } from '@/ui/Week'
import { Check } from '@/ui/icons'
import s from '@/ui/ui.module.css'

export type TicketBookingAction = (state: CustomerBookingActionState, data: FormData) => Promise<CustomerBookingActionState>

function dateFromKey(key: string) {
  return new Date(`${key}T00:00:00+09:00`)
}

function longDate(value: string | Date) {
  return formatJstDate(value, { month: 'long', day: 'numeric', weekday: 'short' })
}

// 日時を選んで、チケット1回で予約する（A案）。
// 日を選ぶ → 時間を選ぶ → 画面下の黒いボタン。終わったら確認の画面に切り替える
export function CustomerWeekCalendar({ availability, availableTicketCount, bookingAction, preview = false }: {
  availability: CustomerAvailabilityDay[]; availableTicketCount: number; bookingAction?: TicketBookingAction; preview?: boolean
}) {
  const router = useRouter()
  const days = availability.map((day) => ({
    ...day,
    cells: day.cells.filter((cell) => cell.value),
    openCount: day.cells.filter((cell) => cell.status === 'open' && cell.value).length,
  }))
  const firstOpen = days.find((day) => day.openCount)?.dateKey ?? days[0]?.dateKey ?? ''
  const [dayKey, setDayKey] = useState(firstOpen)
  const [selected, setSelected] = useState('')
  const submitting = useRef(false)
  const [state, action, pending] = useActionState<CustomerBookingActionState, FormData>(async (previous, formData) => {
    try {
      const result = bookingAction ? await bookingAction(previous, formData) : { status: 'error' as const, message: '確認モードのため予約できません。' }
      if (result?.status !== 'success') submitting.current = false
      return result
    } catch {
      submitting.current = false
      return { status: 'error', message: '予約できたか確認できませんでした。予約一覧を確認してから、もう一度お試しください。' }
    }
  }, null)
  const needsPurchase = availableTicketCount <= 0 || (state?.status === 'error' && state.needsPurchase)

  useEffect(() => {
    if (state?.status === 'success' && !preview) router.refresh()
  }, [state, router, preview])

  if (state?.status === 'success') {
    return (
      <div className={s.done} role="status">
        <span className={s.stateMark}><Check size={34} /></span>
        <p className={s.stateTitle}>予約しました</p>
        <p className={s.doneDate}>{longDate(selected)}</p>
        <p className={s.doneTime}>{formatJstTime(selected)}</p>
        <p className={s.stateText} style={{ marginTop: 10, marginBottom: 0 }}>{state.message}</p>
        <div className={s.doneRow}><span>残りのチケット</span><b>{Math.max(0, availableTicketCount - 1)}回</b></div>
        <div style={{ marginTop: 32 }}><Button href="/customer/app">ホームに戻る</Button></div>
      </div>
    )
  }

  const day = days.find((item) => item.dateKey === dayKey)

  return (
    <form action={action} aria-busy={pending} onSubmit={(event) => {
      if (!selected || needsPurchase || submitting.current) { event.preventDefault(); return }
      submitting.current = true
    }}>
      <input type="hidden" name="scheduled_at" value={selected} />

      <Week
        scroll
        days={days.map((item) => ({
          key: item.dateKey,
          weekday: item.weekday,
          day: Number(item.dateKey.slice(8, 10)),
          empty: !item.openCount,
          disabled: !item.openCount || pending,
          label: `${longDate(dateFromKey(item.dateKey))} 空き${item.openCount}枠`,
        }))}
        selected={dayKey}
        onSelect={(key) => { setDayKey(key); setSelected('') }}
      />

      <Section title={day ? longDate(dateFromKey(day.dateKey)) : '空き時間'} action={day ? `空き ${day.openCount}枠` : undefined}>
        {day?.cells.length ? (
          <div className={s.slots} role="group" aria-label="時間">
            {day.cells.map((cell) => (
              <button
                key={cell.value}
                type="button"
                className={s.slotButton}
                aria-pressed={cell.value === selected}
                disabled={cell.status !== 'open' || pending}
                onClick={() => setSelected(cell.value!)}
              >
                {formatJstTime(cell.value!)}
              </button>
            ))}
          </div>
        ) : <Empty>この日は空いている時間がありません</Empty>}
      </Section>

      <div className={s.actionSpacer} />

      <div className={s.actionBar}>
        {state?.status === 'error' ? <p role="alert" className={s.formError} style={{ margin: '0 6px 10px' }}>{state.message}</p> : null}
        <div className={s.actionSummary}>
          <b>{selected ? `${longDate(selected)} ${formatJstTime(selected)}` : '時間を選んでください'}</b>
          <span>{needsPurchase ? 'チケットがありません' : `チケット ${availableTicketCount}回 → ${availableTicketCount - 1}回`}</span>
        </div>
        {needsPurchase
          ? <Button href="/customer/app/tickets">チケットを買う</Button>
          : <Button type="submit" disabled={!selected || pending}>{pending ? '予約しています…' : 'この日時で予約する'}</Button>}
      </div>
    </form>
  )
}

