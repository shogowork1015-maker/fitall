import { notFound } from 'next/navigation'
import { getPublicBookingData } from '@/lib/public-booking'
import { createPublicBookingCheckoutAction } from './actions'
import { BookingPageContent } from './BookingPageContent'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PublicBookingPage({ params, searchParams }: {
  params: Promise<{ trainerId: string }>
  searchParams: Promise<{ cancelled?: string }>
}) {
  const { trainerId } = await params
  const resolvedSearchParams = await searchParams
  const data = await getPublicBookingData(trainerId)
  if (!data) notFound()
  return <BookingPageContent data={data} checkoutAction={createPublicBookingCheckoutAction} cancelled={resolvedSearchParams.cancelled === '1'} />
}
