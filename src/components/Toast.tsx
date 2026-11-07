'use client'

import { useEffect, useState } from 'react'

const VISIBLE_MS = 2200
const LEAVE_MS = 220

export function Toast({
  message,
  onDone,
}: {
  message: string
  onDone: () => void
}) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const leave = setTimeout(() => setLeaving(true), VISIBLE_MS)
    const done = setTimeout(onDone, VISIBLE_MS + LEAVE_MS)
    return () => {
      clearTimeout(leave)
      clearTimeout(done)
    }
  }, [onDone])

  return (
    <div role="status" aria-live="polite" data-leaving={leaving} className="fitall-toast">
      <span aria-hidden="true" className="fitall-toast-check">✓</span>
      <span>{message}</span>
    </div>
  )
}
