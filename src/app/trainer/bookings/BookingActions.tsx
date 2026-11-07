'use client'

import { approveBooking, rejectBooking, completeBooking } from './actions'
import { useRef, useState } from 'react'
import type { BookingActionResult } from './actions'
import { Toast } from '@/components/Toast'
import { RescheduleModal } from './RescheduleModal'

interface BookingActionsProps {
  bookingId: string
  status: string
  scheduledAt?: string
}

export function BookingActions({ bookingId, status, scheduledAt }: BookingActionsProps) {
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [showReschedule, setShowReschedule] = useState(false)
  const [confirmingReject, setConfirmingReject] = useState(false)

  const [feedback, setFeedback] = useState<string | null>(null)
  const actionPending = useRef(false)

  async function handleAction(action: () => Promise<BookingActionResult>, message: string) {
    if (actionPending.current) return
    actionPending.current = true
    setFeedback(null)
    setToast(null)
    setLoading(true)
    try {
      const result = await action()
      if (result.error) {
        setFeedback(result.error)
        return
      }
      if (result.warning) setFeedback(result.warning)
      else setToast(message)
    } catch {
      setFeedback('結果を確認できませんでした。予約一覧を確認してから、もう一度お試しください。')
    } finally {
      actionPending.current = false
      setLoading(false)
    }
  }

  return (
    <div aria-busy={loading}>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      {feedback && <p role="alert" className="my-3 rounded-control border border-danger-line bg-danger-soft p-3 font-bold text-danger">{feedback}</p>}
      {loading && <p role="status" className="mt-2 flex items-center gap-2 font-bold"><span aria-hidden="true" className="fitall-spinner" />処理中…</p>}
      {status === 'pending' && !confirmingReject && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => handleAction(() => approveBooking(bookingId), '予約を承認しました')}
            disabled={loading}
            className="fitall-aqua-action disabled:opacity-40"
          >
            承認
          </button>
          <button onClick={() => setConfirmingReject(true)} disabled={loading} className="fitall-secondary-action disabled:opacity-40">
            拒否
          </button>
        </div>
      )}
      {status === 'pending' && confirmingReject && (
        <div className="fitall-fade mt-3 rounded-control bg-danger-soft p-3">
          <p className="font-bold text-danger">この予約を拒否しますか？</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => handleAction(() => rejectBooking(bookingId), '予約を拒否しました')}
              disabled={loading}
              className="fitall-danger-action disabled:opacity-40"
            >
              拒否する
            </button>
            <button onClick={() => setConfirmingReject(false)} disabled={loading} className="fitall-secondary-action">
              戻る
            </button>
          </div>
        </div>
      )}
      {status === 'confirmed' && (
      <>
        <div className="mt-3 space-y-2">
          <button
            onClick={() => handleAction(() => completeBooking(bookingId), 'セッションを完了しました')}
            disabled={loading}
            className="fitall-aqua-action disabled:opacity-40"
          >
            完了にする
          </button>
          <button
            onClick={() => setShowReschedule((v) => !v)}
            disabled={loading}
            className="fitall-secondary-action w-full disabled:opacity-40"
          >
            {showReschedule ? '提案をやめる' : 'お客様に日時変更を提案'}
          </button>
        </div>
        {showReschedule && scheduledAt && (
          <RescheduleModal
            bookingId={bookingId}
            currentScheduledAt={scheduledAt}
            onClose={() => setShowReschedule(false)}
          />
        )}
      </>
      )}
    </div>
  )
}
