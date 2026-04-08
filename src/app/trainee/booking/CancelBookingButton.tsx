'use client'

import { useState } from 'react'
import { cancelBookingAction } from './actions'
import { Toast } from '@/components/Toast'

interface Props {
  bookingId: string
  scheduledAt: string
}

export function CancelBookingButton({ bookingId, scheduledAt }: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const hoursUntil = (new Date(scheduledAt).getTime() - Date.now()) / 3600000
  const canCancel = hoursUntil >= 24

  if (done) return null

  if (!canCancel) {
    return (
      <p className="text-xs text-[#9CA3AF] mt-2">
        ※ 24時間以内のキャンセルはトレーナーにご連絡ください
      </p>
    )
  }

  async function handleCancel() {
    if (!confirm('この予約をキャンセルしますか？')) return
    setLoading(true)
    const result = await cancelBookingAction(bookingId)
    setLoading(false)
    if (result.error) {
      setToast(result.error)
    } else {
      setDone(true)
      setToast('予約をキャンセルしました')
    }
  }

  return (
    <>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      <button
        onClick={handleCancel}
        disabled={loading}
        className="mt-2 text-xs font-semibold text-[#EF4444] disabled:opacity-40"
      >
        {loading ? 'キャンセル中...' : 'キャンセルする'}
      </button>
    </>
  )
}
