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
          className="fitall-secondary-action w-full"
        >
          日時を移動
        </button>
      ) : (
        <div className="fitall-fade rounded-control bg-surface-soft p-3">
          <label className="text-base font-medium text-ink-muted">移動先日時</label>
          <input
            type="datetime-local"
            step={300}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-2 h-14 w-full rounded-control border border-line bg-white px-3 text-base font-bold text-ink outline-none focus:border-accent"
          />
          {error && <p className="mt-2 text-base font-semibold text-danger">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="fitall-primary-action flex-1 disabled:opacity-40"
            >
              {pending ? '移動中...' : '移動する'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="fitall-secondary-action flex-1"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
