'use client'

import { useActionState, useEffect, useRef } from 'react'
import type { CustomerTicketCheckoutState } from './actions'

export type TicketCheckoutAction = (state: CustomerTicketCheckoutState, data: FormData) => Promise<CustomerTicketCheckoutState>
export function TicketPurchaseForm({ planId, checkoutAction, preview = false }: {
  planId: string; checkoutAction: TicketCheckoutAction; preview?: boolean
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
  return <form action={action} className="mt-3" onSubmit={event => {
    if (submitting.current) event.preventDefault()
    else submitting.current = true
  }}>
    <input type="hidden" name="plan_id" value={planId} />
    {state && 'error' in state && <p role="alert" className="mb-3 bg-[#FEF2F2] p-3 text-sm text-[#A0102B]">{state.error}</p>}
    <button type="submit" disabled={pending || redirecting} className="fitall-primary-action h-12 w-full text-sm disabled:opacity-40">
      {pending || redirecting ? '処理中…' : preview ? '購入を試す（プレビュー）' : 'このメニューを購入する'}
    </button>
  </form>
}
