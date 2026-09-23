import Link from 'next/link'
import { loadCustomerAppData, nextSuggestedBookingDate } from '@/lib/customer-app'
import { formatJstDateTime } from '@/lib/datetime'

function formatDateTime(value: string) {
  return formatJstDateTime(value, {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function CustomerAppHomePage() {
  const data = await loadCustomerAppData()

  if (!data) {
    return (
      <main className="px-4 py-10">
        <div className="fitall-card p-6 text-center">
          <h1 className="text-xl font-black text-[#0A0A0A]">お客様情報が見つかりません</h1>
          <p className="mt-2 text-sm font-bold leading-relaxed text-[#555555]">
            LINE招待からアプリを開くと、予約とチケットを確認できます。
          </p>
        </div>
      </main>
    )
  }

  const nextBooking = data.upcomingBookings[0]
  const activeTickets = data.tickets.reduce((sum, ticket) => sum + ticket.remaining, 0)
  const scheduledTickets = data.tickets.reduce((sum, ticket) => sum + ticket.scheduled, 0)

  return (
    <main className="pb-28">
      <header className="sticky top-0 z-20 border-b-2 border-[#DDE8E8] bg-white/95 px-4 py-4 backdrop-blur">
        <p className="text-[10px] font-black tracking-[0.16em] text-[#087D78]">LIMITLESS APP</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-[#0A0A0A]">{data.customer.name}さん</h1>
            <p className="mt-1 text-xs font-bold text-[#555555]">{data.trainer.name}さんのトレーニング</p>
          </div>
          {data.preview && (
            <span className="border-2 border-[#0A0A0A] bg-[#E8FBFA] px-2.5 py-1 text-[10px] font-black text-[#0A0A0A]">
              DEMO
            </span>
          )}
        </div>
      </header>

      <div className="space-y-4 px-4 py-5">
        <section className="fitall-card-strong fitall-card-pop overflow-hidden">
          <div className="bg-[#12C7BE] px-4 py-5 text-white">
            <p className="text-[10px] font-black tracking-[0.12em] text-white/80">NEXT SESSION</p>
            {nextBooking ? (
              <>
                <h2 className="mt-2 text-2xl font-black">{formatDateTime(nextBooking.scheduled_at)}</h2>
                <p className="mt-1 text-sm font-bold text-white/90">次回予約は確保されています</p>
              </>
            ) : (
              <>
                <h2 className="mt-2 text-2xl font-black">
                  {activeTickets > 0 ? `次は${nextSuggestedBookingDate()}あたり` : 'チケット購入が必要です'}
                </h2>
                <p className="mt-1 text-sm font-bold text-white/90">
                  {activeTickets > 0 ? '空き枠から予約を入れられます' : '購入後、この画面から予約できます'}
                </p>
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            <Link href="/customer/app/bookings" className="fitall-primary-action fitall-tap h-12 text-sm">
              予約を見る
            </Link>
            <Link href="/customer/app/tickets" className="fitall-secondary-action fitall-tap h-12 text-sm">
              チケット購入
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="fitall-card p-4">
            <p className="text-[10px] font-black text-[#087D78]">使えるチケット</p>
            <p className="mt-2 text-4xl font-black text-[#0A0A0A]">{activeTickets}</p>
            <p className="mt-1 text-xs font-bold text-[#555555]">予約済み {scheduledTickets}枚</p>
          </div>
          <div className="fitall-card p-4">
            <p className="text-[10px] font-black text-[#087D78]">今後の予約</p>
            <p className="mt-2 text-4xl font-black text-[#0A0A0A]">{data.upcomingBookings.length}</p>
            <p className="mt-1 text-xs font-bold text-[#555555]">確定・承認待ち</p>
          </div>
        </section>

        <section className="fitall-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black text-[#087D78]">LINE通知</p>
              <h2 className="mt-1 text-base font-black text-[#0A0A0A]">
                {data.customer.lineUserId ? '連携済み' : '未連携'}
              </h2>
              <p className="mt-1 text-xs font-bold text-[#555555]">
                {data.customer.lineUserId ? '予約通知をLINEで受け取れます' : '予約通知をLINEで受け取る設定ができます'}
              </p>
            </div>
            <Link href="/customer/app/mypage" className="fitall-pill fitall-pill-aqua">
              設定
            </Link>
          </div>
        </section>

        <section className="fitall-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="fitall-section-title">チケット</h2>
            <Link href="/customer/app/tickets" className="text-xs font-black text-[#087D78]">
              すべて見る
            </Link>
          </div>
          <div className="space-y-2">
            {data.tickets.slice(0, 2).map((ticket) => (
              <div key={ticket.id} className="grid grid-cols-[1fr_auto] gap-3 border-2 border-[#DDE8E8] bg-white p-3">
                <div>
                  <p className="text-[10px] font-black text-[#087D78]">
                    {ticket.kind === 'monthly' ? '月謝' : '回数券'}
                  </p>
                  <p className="mt-1 text-sm font-black text-[#0A0A0A]">{ticket.title}</p>
                  <p className="mt-1 text-xs font-bold text-[#555555]">{ticket.expiresLabel}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-[#0A0A0A]">{ticket.remaining}</p>
                  <p className="text-[10px] font-black text-[#555555]">/ {ticket.total}枚</p>
                </div>
              </div>
            ))}
            {!data.tickets.length && (
              <div className="border-2 border-dashed border-[#DDE8E8] bg-[#F4F7F7] px-4 py-5 text-center">
                <p className="text-sm font-black text-[#0A0A0A]">チケットはまだありません</p>
                <Link href="/customer/app/tickets" className="mt-3 inline-flex text-xs font-black text-[#087D78] underline">
                  チケットを購入する
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="fitall-card p-4">
          <h2 className="fitall-section-title">月謝ルール</h2>
          <div className="mt-3 space-y-2 text-sm font-bold leading-relaxed text-[#555555]">
            <p>月謝チケットは毎月自動で付与され、固定予約がある場合は予約に自動で使われます。</p>
            <p>未使用分は月末で失効します。繰越が必要な場合はトレーナーが許可できます。</p>
          </div>
        </section>
      </div>
    </main>
  )
}
