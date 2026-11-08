import Link from 'next/link'
import type { ComponentProps } from 'react'
import { PublicBookingForm } from './PublicBookingForm'

export function BookingPageContent({ data, checkoutAction, cancelled = false }: ComponentProps<typeof PublicBookingForm> & { cancelled?: boolean }) {
  return (
    <main className="min-h-screen bg-white px-4 py-6">
      <div className="mx-auto w-full max-w-[430px]">
        <header className="mb-7 border-b-2 border-ink pb-5">
          <p className="text-base font-bold text-brand">Limitless Booking</p>
          <h1 className="mt-2 text-2xl font-black leading-tight">{data.trainer.name}さんのチケット</h1>
          <p className="mt-3 text-subhead text-ink-muted">先にチケットを購入して、お好きな日時に予約。</p>
          <Link href="/customer/app/bookings" className="mt-3 inline-flex min-h-11 items-center text-base font-bold text-brand underline underline-offset-4">
            チケットをお持ちの方は予約へ
          </Link>
        </header>
        {cancelled && <p role="status" className="mb-5 rounded-control bg-danger-soft px-4 py-3 text-base leading-relaxed text-danger">
          購入をキャンセルしました。チケットは追加されていません。
        </p>}
        <PublicBookingForm data={data} checkoutAction={checkoutAction} />
      </div>
    </main>
  )
}
