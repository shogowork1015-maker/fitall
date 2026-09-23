'use client'

import { useState, useTransition } from 'react'
import { moveBookingAction } from './actions'
import { Toast } from '@/components/Toast'

function toLocalInputValue(iso: string) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

export function MoveBookingForm({
  bookingId,
  scheduledAt,
  disabled,
}: {
  bookingId: string
  scheduledAt: string
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(toLocalInputValue(scheduledAt))
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await moveBookingAction(bookingId, value)
      if (result.error) {
        setError(result.error)
        return
      }
      setToast('予約を移動しました')
      setOpen(false)
    })
  }

  if (disabled) return null

  return (
    <div className="mt-3">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-10 rounded-[6px] border-2 border-[#DDE8E8] bg-white px-4 text-xs font-black text-[#0A0A0A] active:scale-[0.97]"
        >
          日時を移動
        </button>
      ) : (
        <div className="rounded-[6px] border-2 border-[#DDE8E8] bg-[#F4F7F7] p-3">
          <label className="text-[11px] font-black text-[#555555]">移動先日時</label>
          <input
            type="datetime-local"
            step={300}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-2 h-11 w-full rounded-[6px] border-2 border-[#DDE8E8] bg-white px-3 text-sm font-bold text-[#0A0A0A] outline-none focus:border-[#12C7BE]"
          />
          {error && <p className="mt-2 text-xs font-semibold text-[#D4183D]">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="h-10 flex-1 rounded-[6px] bg-[#0A0A0A] text-xs font-black text-white disabled:opacity-40"
            >
              {pending ? '移動中...' : '移動する'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 flex-1 rounded-[6px] border-2 border-[#DDE8E8] bg-white text-xs font-black text-[#555555]"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
