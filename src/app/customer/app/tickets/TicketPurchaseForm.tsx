'use client'

import { useActionState, useEffect } from 'react'
import { SubmitButton } from '@/components/SubmitButton'
import {
  createCustomerTicketCheckoutAction,
  type CustomerTicketCheckoutState,
} from './actions'

export function TicketPurchaseForm({ planId }: { planId: string }) {
  const [state, action] = useActionState<CustomerTicketCheckoutState, FormData>(
    createCustomerTicketCheckoutAction,
    null
  )

  useEffect(() => {
    if (state && 'checkoutUrl' in state) {
      window.location.href = state.checkoutUrl
    }
  }, [state])

  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="plan_id" value={planId} />
      {state && 'error' in state && (
        <div className="mb-2 border-2 border-[#D4183D] bg-[#FEF2F2] px-3 py-2 text-xs font-black text-[#D4183D]">
          {state.error}
        </div>
      )}
      <SubmitButton className="fitall-primary-action fitall-tap h-11 w-full text-xs">
        このメニューを購入
      </SubmitButton>
    </form>
  )
}
