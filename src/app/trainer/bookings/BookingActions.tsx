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
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => handleAction(() => approveBooking(bookingId), '予約を承認しました')}
            disabled={loading}
            className="flex-1 h-14 bg-[#0066FF] text-white text-sm font-bold rounded-full disabled:opacity-40 active:scale-[0.97] transition-transform"
          >
            承認
          </button>
          <button
            onClick={() => handleAction(() => rejectBooking(bookingId), '予約を拒否しました')}
            disabled={loading}
            className="flex-1 h-14 bg-transparent text-[#0A0A0A] text-sm font-bold rounded-full border-[1.5px] border-[#E5E7EB] disabled:opacity-40 active:scale-[0.97] transition-transform"
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
            className="w-full h-14 bg-[#0066FF] text-white text-sm font-bold rounded-full disabled:opacity-40 active:scale-[0.97] transition-transform"
          >
            完了にする
          </button>
          <button
            onClick={() => setShowReschedule((v) => !v)}
            disabled={loading}
            className="w-full h-10 text-[#6B7280] text-sm font-semibold rounded-full border border-[#E5E7EB] active:scale-[0.97] transition-transform"
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
