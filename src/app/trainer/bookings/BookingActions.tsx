'use client'

import { approveBooking, rejectBooking, completeBooking } from './actions'
import { useState } from 'react'
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

  async function handleAction(action: () => Promise<void>, message: string) {
    setLoading(true)
    try {
      await action()
      setToast(message)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'pending') {
    return (
      <>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
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
      </>
    )
  }

  if (status === 'confirmed') {
    return (
      <>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
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
    )
  }

  return null
}
