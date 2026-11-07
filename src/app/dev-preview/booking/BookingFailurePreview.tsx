'use client'

import { BookingPageContent } from '@/app/book/[trainerId]/BookingPageContent'
import type { PublicBookingData } from '@/lib/public-booking'
import type { PublicBookingState } from '@/app/book/[trainerId]/actions'

/** Local failure simulation, reachable only inside the guarded development route. */
export function BookingFailurePreview({ data, exception }: { data: PublicBookingData; exception: boolean }) {
  async function simulateCheckout(): Promise<PublicBookingState> {
    await new Promise(resolve => setTimeout(resolve, 1200))
    if (exception) throw new Error('Simulated connection failure')
    return { error: '決済画面を開けませんでした。もう一度お試しください。' }
  }
  return <BookingPageContent data={data} checkoutAction={simulateCheckout} />
}
