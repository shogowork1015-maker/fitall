'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveBooking } from './actions'
import { Button } from '@/ui/Button'

// その場で予約を承認する小さなボタン（ホームや予約の流れの中に置く）
export function ApproveButton({ bookingId, preview = false }: { bookingId: string; preview?: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function approve(event?: { stopPropagation?: () => void }) {
    event?.stopPropagation?.()
    if (preview) { setDone(true); return }
    setError('')
    startTransition(async () => {
      try {
        const result = await approveBooking(bookingId)
        if (result.error) { setError(result.error); return }
        setDone(true)
        router.refresh()
      } catch {
        setError('承認できたか確認できませんでした')
      }
    })
  }

  if (done) return <span>承認しました</span>
  return (
    <span onClick={(event) => event.stopPropagation()} title={error || undefined}>
      <Button size="small" disabled={pending} onClick={() => approve()}>
        {pending ? '承認中…' : error ? 'もう一度' : '承認'}
      </Button>
    </span>
  )
}
