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
      {feedback && <p role="alert" className="my-3 rounded-md border border-[#DDE8E8] bg-white p-3 text-sm font-bold">{feedback}</p>}
      {loading && <p role="status" className="text-sm font-bold">処理中…</p>}
      {status === 'pending' && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => handleAction(() => approveBooking(bookingId), '予約を承認しました')}
            disabled={loading}
            className="h-12 flex-1 rounded-[6px] border-2 border-[#12C7BE] bg-[#12C7BE] text-sm font-black text-white disabled:opacity-40 active:scale-[0.97] transition-transform"
          >
            承認
          </button>
          <button
            onClick={() => handleAction(() => rejectBooking(bookingId), '予約を拒否しました')}
            disabled={loading}
            className="h-12 flex-1 rounded-[6px] border-2 border-[#DDE8E8] bg-white text-sm font-black text-[#0A0A0A] disabled:opacity-40 active:scale-[0.97] transition-transform"
          >
            拒否
          </button>
        </div>
      )}
      {status === 'confirmed' && (
      <>
        <div className="mt-3 space-y-2">
          <button
            onClick={() => handleAction(() => completeBooking(bookingId), 'セッションを完了しました')}
            disabled={loading}
            className="h-12 w-full rounded-[6px] border-2 border-[#12C7BE] bg-[#12C7BE] text-sm font-black text-white disabled:opacity-40 active:scale-[0.97] transition-transform"
          >
            完了にする
          </button>
          <button
            onClick={() => setShowReschedule((v) => !v)}
            disabled={loading}
            className="h-10 w-full rounded-[6px] border-2 border-[#DDE8E8] text-sm font-black text-[#555555] active:scale-[0.97] transition-transform"
          >
            {showReschedule ? '変更をキャンセル' : '日時変更を提案'}
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
