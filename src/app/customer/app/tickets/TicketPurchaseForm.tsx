'use client'

import { useActionState, useEffect, useRef } from 'react'
import type { CustomerTicketCheckoutState } from './actions'
import { Button } from '@/ui/Button'

export type TicketCheckoutAction = (state: CustomerTicketCheckoutState, data: FormData) => Promise<CustomerTicketCheckoutState>

// 購入ボタン。押すとStripeの決済画面へ移る
export function TicketPurchaseForm({ planId, checkoutAction, preview = false, label = '購入する' }: {
  planId: string; checkoutAction: TicketCheckoutAction; preview?: boolean; label?: string
}) {
  const submitting = useRef(false)
  const [state, action, pending] = useActionState<CustomerTicketCheckoutState, FormData>(async (previous, data) => {
    try {
      const result = await checkoutAction(previous, data)
      if (!result || !('checkoutUrl' in result)) submitting.current = false
      return result
    } catch {
      submitting.current = false
      return { error: '決済画面を開けませんでした。もう一度お試しください。' }
    }
  }, null)
  const redirecting = Boolean(state && 'checkoutUrl' in state)
  useEffect(() => { if (state && 'checkoutUrl' in state) window.location.assign(state.checkoutUrl) }, [state])

  return (
    <form action={action} onSubmit={(event) => {
      if (submitting.current) event.preventDefault()
      else submitting.current = true
    }}>
      <input type="hidden" name="plan_id" value={planId} />
      {state && 'error' in state ? <p role="alert" style={{ color: 'var(--ui-red)', fontSize: 15, marginBottom: 12 }}>{state.error}</p> : null}
      <Button type="submit" disabled={pending || redirecting}>
        {pending || redirecting ? '決済画面を開いています…' : preview ? `${label}（確認モード）` : label}
      </Button>
    </form>
  )
}
