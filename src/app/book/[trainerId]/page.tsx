import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPublicBookingData } from '@/lib/public-booking'
import { PublicBookingForm } from './PublicBookingForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PublicBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ trainerId: string }> | { trainerId: string }
  searchParams: Promise<{ cancelled?: string }> | { cancelled?: string }
}) {
  const { trainerId } = await params
  const resolvedSearchParams = await searchParams
  const data = await getPublicBookingData(trainerId)

  if (!data) notFound()

  return (
    <div className="min-h-screen bg-white px-4 py-5">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-[430px] flex-col">
        <div className="mb-5 overflow-hidden rounded-[6px] border-2 border-[#0A0A0A] bg-white">
          <div className="bg-[#12C7BE] px-5 py-4 text-white">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/80">
            Limitless Booking
            </p>
            <h1 className="mt-2 text-2xl font-black leading-tight">
              {data.trainer.name}さんの予約
            </h1>
          </div>
          <p className="px-5 py-4 text-sm font-bold leading-relaxed text-[#555555]">
            予約はお客様アプリのマイページから行います。チケットがある場合はそのまま予約、ない場合はチケット購入へ進みます。
          </p>
        </div>

        {resolvedSearchParams.cancelled === '1' && (
          <div className="mb-4 rounded-[6px] border-2 border-[#D4183D] bg-[#FEF2F2] px-4 py-3 text-sm font-bold text-[#D4183D]">
            決済がキャンセルされました。内容を確認してもう一度お試しください。
          </div>
        )}

        <div className="mb-4 grid grid-cols-1 gap-2">
          <Link href="/customer/app/bookings" className="fitall-primary-action fitall-tap h-12 text-sm">
            マイページで予約する
          </Link>
          <Link href="/customer/app/tickets" className="fitall-secondary-action fitall-tap h-12 text-sm">
            チケットを確認・購入する
          </Link>
        </div>

        <div className="mb-3 border-2 border-[#DDE8E8] bg-[#F4F7F7] px-3 py-3">
          <p className="text-xs font-black text-[#087D78]">初回専用</p>
          <p className="mt-1 text-sm font-bold leading-relaxed text-[#555555]">
            まだマイページがない方だけ、下のフォームで初回チケット購入と初回予約を同時に行えます。
          </p>
        </div>

        <div className="bg-white">
          <PublicBookingForm data={data} />
        </div>

        <p className="px-2 py-5 text-center text-[11px] font-bold leading-relaxed text-[#9CA3AF]">
          お支払い情報はStripeで安全に処理されます。予約変更やチケット繰越はトレーナーへご相談ください。
        </p>
      </div>
    </div>
  )
}
