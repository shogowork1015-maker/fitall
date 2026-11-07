import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { BookingManagementPreview } from './BookingManagementPreview'
import { TicketFlowPreview } from './TicketFlowPreview'
import { BookingFailurePreview } from './BookingFailurePreview'
import { BookingPageContent } from '@/app/book/[trainerId]/BookingPageContent'
import { addDaysToDateKey, formatJstDateKey, parseJstDateTime } from '@/lib/datetime'
import type { PublicBookingData } from '@/lib/public-booking'

export const dynamic = 'force-dynamic'

export default async function BookingPreview({ searchParams }: { searchParams: Promise<{ empty?: string; cancelled?: string; test?: string; view?: string }> }) {
  if (process.env.NODE_ENV !== 'development' || process.env.FITALL_BOOKING_PREVIEW !== '1') notFound()
  const host = (await headers()).get('host') ?? ''
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) notFound()
  const query = await searchParams
  const firstDay = addDaysToDateKey(formatJstDateKey(), 1)
  const data: PublicBookingData = {
    trainer: { profileId: 'preview-only', userId: 'preview-only', name: 'サンプルトレーナー' },
    menus: query.empty === '1' ? [] : [
      { id: 'preview-one', name: '体験レッスン', price: 5000, sessions: 1, billing_type: 'ticket', description: '' },
      { id: 'preview-four', name: '4回チケット', price: 28000, sessions: 4, billing_type: 'ticket', description: '' },
    ],
    slots: [0, 1, 3, 5, 7, 8, 10, 13].flatMap(day => ['10:00', '10:30', '14:00', '18:00'].map(time => ({
      value: parseJstDateTime(addDaysToDateKey(firstDay, day), time).toISOString(), label: time,
    }))),
  }
  if (query.view === 'manage') return <BookingManagementPreview slots={data.slots} late={query.test === 'late'} fail={query.test === 'error'} />
  if (query.view !== 'purchase') return <TicketFlowPreview source={data} empty={query.empty === '1'} fail={query.test === 'error'} />
  return <>
    <p className="bg-accent-soft px-4 py-3 text-center text-base font-bold text-brand">開発プレビュー · サンプル表示 · 予約・決済・通知は行いません</p>
    {query.test === 'error' || query.test === 'exception'
      ? <BookingFailurePreview data={data} exception={query.test === 'exception'} />
      : <BookingPageContent data={data} cancelled={query.cancelled === '1'} />}
  </>
}
