'use client'

import { useState } from 'react'
import { acceptChangeAction, rejectChangeAction } from './actions'
import { Toast } from '@/components/Toast'

interface Props {
  proposalId: string
  bookingId: string
  originalAt: string
  proposedAt: string
}

export function ChangeProposalCard({ proposalId, bookingId, originalAt, proposedAt }: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  if (done) return null

  async function handleAccept() {
    setLoading(true)
    const result = await acceptChangeAction(proposalId)
    setLoading(false)
    if (result.error) {
      setToast(result.error)
    } else {
      setDone(true)
      setToast('日時変更を承認しました')
    }
  }

  async function handleReject() {
    setLoading(true)
    const result = await rejectChangeAction(proposalId)
    setLoading(false)
    if (result.error) {
      setToast(result.error)
    } else {
      setDone(true)
      setToast('日時変更を拒否しました')
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ja-JP', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    }) +
    ' ' +
    new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-[20px] p-4">
        <p className="text-xs font-bold text-[#92400E] mb-3">📅 日時変更の提案があります</p>
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#9CA3AF] text-xs">現在</span>
            <span className="font-medium text-[#6B7280] line-through">{formatDate(originalAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#0066FF] text-xs font-bold">新日時</span>
            <span className="font-bold text-[#0A0A0A]">{formatDate(proposedAt)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 h-11 bg-[#0066FF] text-white text-sm font-bold rounded-full disabled:opacity-40 active:scale-[0.97] transition-transform"
          >
            承認する
          </button>
          <button
            onClick={handleReject}
            disabled={loading}
            className="flex-1 h-11 bg-transparent text-[#0A0A0A] text-sm font-bold rounded-full border border-[#E5E7EB] disabled:opacity-40 active:scale-[0.97] transition-transform"
          >
            拒否する
          </button>
        </div>
      </div>
    </>
  )
}
