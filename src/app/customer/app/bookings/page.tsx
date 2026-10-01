import Link from 'next/link'
import { loadCustomerAppData, loadCustomerAppEntryData } from '@/lib/customer-app'
import { formatJstDate, formatJstTime } from '@/lib/datetime'
import { createCustomerBookingAction } from './actions'
import { CustomerWeekCalendar } from './CustomerWeekCalendar'

interface PageProps {
  searchParams?: Promise<{
    booked?: string
    trainer_id?: string
  }>
}

function formatDate(value: string) {
  return formatJstDate(value, {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  })
}

function formatTime(value: string) {
  return formatJstTime(value, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusLabel(status: string) {
  if (status === 'pending') return '承認待ち'
  if (status === 'confirmed') return '確定'
  if (status === 'completed') return '完了'
  return 'キャンセル'
}

function lineShareUrl(message: string) {
  return `https://social-plugins.line.me/lineit/share?text=${encodeURIComponent(message)}`
}

export default async function CustomerBookingsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const data = await loadCustomerAppData()
  const entryData = data ? null : await loadCustomerAppEntryData(params?.trainer_id)
  const availableTicketCount = data?.tickets.reduce((sum, ticket) => sum + ticket.remaining, 0) ?? 0

  return (
    <main className="pb-28">
      <header className="sticky top-0 z-20 border-b-2 border-[#DDE8E8] bg-white/95 px-4 py-4 backdrop-blur">
        <p className="text-[10px] font-black tracking-[0.16em] text-[#087D78]">SCHEDULE</p>
        <h1 className="mt-1 text-2xl font-black text-[#0A0A0A]">予約</h1>
      </header>

      {!data ? (
        <div className="px-4 py-6">
          <div className="fitall-card-strong overflow-hidden">
            <div className="bg-[#12C7BE] px-4 py-5 text-white">
              <p className="text-[10px] font-black tracking-[0.12em] text-white/80">FIRST TIME</p>
              <h2 className="mt-1 text-2xl font-black">チケットを購入して予約</h2>
              <p className="mt-2 text-sm font-bold leading-relaxed text-white/90">
                まだお客様情報がないため、メニューを購入してチケットを追加します。予約日時は購入後に選べます。
              </p>
            </div>
            <div className="space-y-3 p-4">
              {entryData ? (
                <>
                  <div className="border-2 border-[#DDE8E8] bg-white px-3 py-3">
                    <p className="text-[10px] font-black text-[#087D78]">TRAINER</p>
                    <p className="mt-1 text-sm font-black text-[#0A0A0A]">
                      {entryData.trainer.name}さん
                    </p>
                  </div>
                  <Link
                    href={`/book/${entryData.trainer.profileId}`}
                    className="fitall-primary-action fitall-tap h-12 text-sm"
                  >
                    チケットを購入する
                  </Link>
                </>
              ) : (
                <div className="border-2 border-dashed border-[#DDE8E8] bg-[#F4F7F7] px-4 py-5 text-center text-sm font-black text-[#555555]">
                  LINEの登録リンクから開き直してください
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 px-4 py-5">
          {params?.booked === '1' && (
            <div className="border-2 border-[#12C7BE] bg-[#E8FBFA] px-3 py-3 text-sm font-black text-[#087D78]">
              予約が確定しました。チケットを1枚使用予定にしました。
            </div>
          )}

          <section className="fitall-card p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="fitall-section-title">使えるチケット</p>
                <h2 className="mt-1 text-2xl font-black text-[#0A0A0A]">残り {availableTicketCount}枚</h2>
              </div>
              <Link href="/customer/app/tickets" className="fitall-pill fitall-pill-aqua">
                詳細
              </Link>
            </div>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {data.tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="w-[172px] shrink-0 border-2 border-[#DDE8E8] bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-black text-[#087D78]">
                        {ticket.kind === 'monthly' ? '月謝' : '回数券'}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm font-black leading-tight text-[#0A0A0A]">
                        {ticket.title}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black leading-none text-[#0A0A0A]">{ticket.remaining}</p>
                      <p className="text-[10px] font-black text-[#555555]">/ {ticket.total}枚</p>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-[#DDE8E8] pt-2">
                    <p className="text-[11px] font-black text-[#555555]">有効期限</p>
                    <p className="mt-0.5 text-xs font-black text-[#0A0A0A]">{ticket.expiresLabel}</p>
                  </div>
                </div>
              ))}
              {!data.tickets.length && (
                <div className="w-full border-2 border-dashed border-[#DDE8E8] bg-[#F4F7F7] px-4 py-5 text-center text-sm font-black text-[#555555]">
                  使えるチケットがありません
                </div>
              )}
            </div>
          </section>

          <section className="fitall-card-strong overflow-hidden">
            <div className="bg-[#12C7BE] px-4 py-4 text-white">
              <p className="text-[10px] font-black tracking-[0.12em] text-white/80">OPEN CALENDAR</p>
              <h2 className="mt-1 text-xl font-black">
                {availableTicketCount > 0 ? 'チケットで予約する' : '空き時間を確認'}
              </h2>
              <p className="mt-1 text-sm font-bold text-white/90">
                {availableTicketCount > 0
                  ? '日時を選んで、チケットを1枚使用します'
                  : 'チケット購入後にこの画面から予約できます'}
              </p>
            </div>
            <CustomerWeekCalendar
              availability={data.availability}
              availableTicketCount={availableTicketCount}
              bookingAction={data.preview ? undefined : createCustomerBookingAction}
            />
          </section>

          <section className="fitall-card p-4">
            <h2 className="fitall-section-title">これからの予約</h2>
            <div className="mt-3 space-y-2">
              {data.upcomingBookings.length ? (
                data.upcomingBookings.map((booking) => (
                  <div key={booking.id} className="grid grid-cols-[64px_1fr_auto] items-center gap-3 border-2 border-[#DDE8E8] bg-white px-3 py-3">
                    <div className="text-center">
                      <p className="text-lg font-black text-[#0A0A0A]">{formatDate(booking.scheduled_at).split(' ')[0]}</p>
                      <p className="text-[10px] font-black text-[#555555]">{formatDate(booking.scheduled_at).split(' ')[1] ?? ''}</p>
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#0A0A0A]">{formatTime(booking.scheduled_at)} セッション</p>
                    </div>
                    <span className="bg-[#E8FBFA] px-2 py-1 text-[10px] font-black text-[#087D78]">
                      {statusLabel(booking.status)}
                    </span>
                    <a
                      href={lineShareUrl(
                        `${data.trainer.name}さん、${formatDate(booking.scheduled_at)} ${formatTime(booking.scheduled_at)}の予約変更を相談したいです。\n${data.customer.name}`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="col-span-3 h-10 rounded-[6px] border-2 border-[#DDE8E8] bg-white px-3 text-center text-xs font-black leading-9 text-[#0A0A0A]"
                    >
                      LINEで変更相談
                    </a>
                  </div>
                ))
              ) : (
                <div className="border-2 border-dashed border-[#DDE8E8] bg-[#F4F7F7] px-4 py-6 text-center text-sm font-black text-[#555555]">
                  次回予約はまだありません
                </div>
              )}
            </div>
          </section>

          <section className="fitall-card p-4">
            <h2 className="fitall-section-title">過去の予約</h2>
            <div className="mt-3 space-y-2">
              {data.pastBookings.slice(0, 8).map((booking) => (
                <div key={booking.id} className="flex items-center justify-between border-b border-[#DDE8E8] py-3 last:border-b-0">
                  <div>
                    <p className="text-sm font-black text-[#0A0A0A]">{formatDate(booking.scheduled_at)} {formatTime(booking.scheduled_at)}</p>
                    <p className="mt-0.5 text-xs font-bold text-[#555555]">{statusLabel(booking.status)}</p>
                  </div>
                  <p className="text-sm font-black text-[#0A0A0A]">{booking.price > 0 ? `¥${booking.price.toLocaleString()}` : ''}</p>
                </div>
              ))}
              {!data.pastBookings.length && (
                <p className="py-4 text-center text-sm font-black text-[#555555]">履歴はまだありません</p>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
