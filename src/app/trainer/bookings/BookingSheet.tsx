'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addDaysToDateKey, formatJstDate, formatJstDateKey, formatJstTime } from '@/lib/datetime'
import { Section, Row, statusText } from '@/ui/List'
import { Button } from '@/ui/Button'
import s from '@/ui/ui.module.css'
import {
  approveBooking,
  completeBooking,
  moveBookingAction,
  proposeRescheduleAction,
  rejectBooking,
  type BookingActionResult,
} from './actions'
import b from './bookings.module.css'

export interface TrainerBooking {
  id: string
  scheduled_at: string
  trainee_id: string
  trainee_name: string
  price: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  credit_status?: string | null
  /** このお客様のチケットの残り（分からないときは null） */
  remaining?: number | null
  /** はじめての予約かどうか */
  first_time?: boolean
}

type Mode = 'view' | 'reject' | 'move' | 'propose'

function creditLabel(status?: string | null) {
  if (status === 'scheduled') return '使用予定'
  if (status === 'used') return '使用済み'
  if (status === 'available') return '返却済み'
  return null
}

// 予約の詳細シートの中身。承認・断る・完了・日時の移動・変更の提案
export function BookingSheet({ booking, preview, onDone }: {
  booking: TrainerBooking
  preview: boolean
  onDone: (message: string) => void
}) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('view')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const currentKey = formatJstDateKey(booking.scheduled_at)
  const [date, setDate] = useState(currentKey)
  const [time, setTime] = useState(formatJstTime(booking.scheduled_at, { hour: '2-digit', minute: '2-digit', hour12: false }))
  const credit = creditLabel(booking.credit_status)

  // サーバーの処理を呼び、結果をシートに出す。成功したらシートを閉じて一覧を更新する
  function run(action: () => Promise<BookingActionResult>, success: string) {
    setError('')
    startTransition(async () => {
      try {
        const result = await action()
        if (result.error) { setError(result.error); return }
        router.refresh()
        onDone(result.warning ?? success)
      } catch {
        setError('結果を確認できませんでした。一覧を確認してから、もう一度お試しください。')
      }
    })
  }

  return (
    <div aria-busy={pending}>
      <Section group header="予約">
        <Row title="お客様" value={booking.trainee_name} strongValue />
        <Row title="日時" value={`${formatJstDate(booking.scheduled_at, { month: 'long', day: 'numeric', weekday: 'short' })} ${formatJstTime(booking.scheduled_at)}`} />
        <Row title="料金" value={`¥${booking.price.toLocaleString()}`} />
        <Row title="状態" value={statusText(booking.status)} />
        {credit ? <Row title="チケット" value={credit} /> : null}
      </Section>

      {error ? <p role="alert" className={b.message} data-tone="error">{error}</p> : null}

      {preview ? (
        <p className={b.message} style={{ color: 'var(--ui-label-2)' }}>確認モードのため、操作は保存されません。</p>
      ) : (
        <>
          {mode === 'view' && booking.status === 'pending' ? (
            <Section>
              <div className={b.actions}>
                <Button disabled={pending} onClick={() => run(() => approveBooking(booking.id), '予約を承認しました')}>{pending ? '処理しています…' : '承認する'}</Button>
                <Button variant="destructive" disabled={pending} onClick={() => setMode('reject')}>断る</Button>
              </div>
            </Section>
          ) : null}

          {mode === 'reject' ? (
            <Section footer="お客様のチケットは返却されます。">
              <div className={b.actions}>
                <Button variant="destructive" disabled={pending} onClick={() => run(() => rejectBooking(booking.id), '予約を断りました')}>{pending ? '処理しています…' : 'この予約を断る'}</Button>
                <Button variant="secondary" disabled={pending} onClick={() => setMode('view')}>やめる</Button>
              </div>
            </Section>
          ) : null}

          {mode === 'view' && booking.status === 'confirmed' ? (
            <Section>
              <div className={b.actions}>
                <Button disabled={pending} onClick={() => run(() => completeBooking(booking.id), 'セッションを完了にしました')}>{pending ? '処理しています…' : '完了にする'}</Button>
                <Button variant="secondary" disabled={pending} onClick={() => setMode('move')}>日時を移動する</Button>
                <Button variant="secondary" disabled={pending} onClick={() => { setMode('propose'); setDate(addDaysToDateKey(formatJstDateKey(), 1)) }}>お客様に変更を提案</Button>
              </div>
            </Section>
          ) : null}

          {mode === 'move' || mode === 'propose' ? (
            <>
              <Section group header={mode === 'move' ? '移動先の日時' : '提案する日時'} footer={mode === 'move' ? 'お客様の予約がそのまま移動します。' : 'お客様に新しい日時を提案します。承諾されると移動します。'}>
                <div className={s.field}>
                  <label htmlFor="booking-date">日付</label>
                  <input id="booking-date" type="date" value={date} min={mode === 'propose' ? addDaysToDateKey(formatJstDateKey(), 1) : undefined} onChange={(event) => setDate(event.target.value)} />
                </div>
                <div className={s.field}>
                  <label htmlFor="booking-time">開始</label>
                  <input id="booking-time" type="time" step={300} value={time} onChange={(event) => setTime(event.target.value)} />
                </div>
              </Section>
              <Section>
                <div className={b.actions}>
                  <Button
                    disabled={pending || !date || !time}
                    onClick={() => run(
                      () => mode === 'move' ? moveBookingAction(booking.id, `${date}T${time}`) : proposeRescheduleAction(booking.id, `${date}T${time}:00`),
                      mode === 'move' ? '予約を移動しました' : '日時の変更を提案しました',
                    )}
                  >
                    {pending ? '処理しています…' : mode === 'move' ? 'この日時に移動' : 'この日時を提案'}
                  </Button>
                  <Button variant="secondary" disabled={pending} onClick={() => setMode('view')}>やめる</Button>
                </div>
              </Section>
            </>
          ) : null}
        </>
      )}
    </div>
  )
}
