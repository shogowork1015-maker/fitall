import Link from 'next/link'
import type { ComponentProps } from 'react'
import { PublicBookingForm } from './PublicBookingForm'

export function BookingPageContent({ data, checkoutAction, cancelled = false }: ComponentProps<typeof PublicBookingForm> & { cancelled?: boolean }) {
  return (
    <main className="min-h-screen bg-white px-4 py-6">
      <div className="mx-auto w-full max-w-[430px]">
        <header className="mb-7 border-b-2 border-[#0A0A0A] pb-5">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#087D78]">Limitless Booking</p>
          <h1 className="mt-2 text-2xl font-black leading-tight">{data.trainer.name}さんのチケット</h1>
          <p className="mt-3 text-sm text-[#555555]">先にチケットを購入して、お好きな日時に予約。</p>
          <Link href="/customer/app/bookings" className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-[#087D78] underline underline-offset-4">
            チケットをお持ちの方は予約へ
          </Link>
        </header>
        {cancelled && <p role="status" className="mb-5 rounded-md bg-[#FEF2F2] px-4 py-3 text-sm leading-relaxed text-[#A0102B]">
          購入をキャンセルしました。チケットは追加されていません。
        </p>}
        <PublicBookingForm data={data} checkoutAction={checkoutAction} />
      </div>
    </main>
  )
}
