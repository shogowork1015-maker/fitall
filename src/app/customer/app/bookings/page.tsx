import Link from 'next/link'
import { loadCustomerAppData, loadCustomerAppEntryData } from '@/lib/customer-app'
import { formatJstDate, formatJstTime } from '@/lib/datetime'
import { createCustomerBookingAction } from './actions'
import { CustomerWeekCalendar } from './CustomerWeekCalendar'
import { DevPreviewNote, PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'

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

export default async function CustomerBookingsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const data = await loadCustomerAppData()
  const entryData = data ? null : await loadCustomerAppEntryData(params?.trainer_id)
  const availableTicketCount = data?.tickets.reduce((sum, ticket) => sum + ticket.remaining, 0) ?? 0

  return (
    <main>
      <PageHeader
        title="予約"
        subtitle={data ? `使えるチケット ${availableTicketCount}枚` : undefined}
      />

      {!data ? (
        <div className="fitall-page-pad">
          <section className="fitall-card p-5">
            <p className="text-base font-medium text-ink-muted">はじめての方</p>
            <h2 className="mt-1 text-xl font-bold text-ink">チケットを購入して予約</h2>
            <p className="mt-2 text-base leading-relaxed text-ink-muted">
              メニューを購入するとチケットが追加され、予約日時を選べるようになります。
            </p>
            {entryData ? (
              <>
                <div className="fitall-row mt-4 !px-0">
                  <span className="fitall-avatar">{entryData.trainer.name[0] ?? '?'}</span>
                  <div className="fitall-row-main">
                    <p className="text-base text-ink-muted">担当トレーナー</p>
                    <p className="fitall-row-title">{entryData.trainer.name}さん</p>
                  </div>
                </div>
                <Link href={`/book/${entryData.trainer.profileId}`} className="fitall-primary-action mt-4">
                  チケットを購入する
                </Link>
              </>
            ) : (
              <p className="mt-4 rounded-control bg-surface-soft px-4 py-4 text-center text-base text-ink-muted">
                LINEの登録リンクから開き直してください
              </p>
            )}
          </section>
        </div>
      ) : (
        <div className="fitall-page-pad space-y-7">
          {data.preview && <DevPreviewNote>開発用の確認モード。予約は保存されません。</DevPreviewNote>}
          {params?.booked === '1' && (
            <p role="status" className="rounded-control bg-accent-soft px-4 py-3 text-base font-semibold text-brand">
              予約が確定しました。チケットを1枚使用予定にしました。
            </p>
          )}

          <section aria-label="日時を選ぶ">
            <h2 className="fitall-group-label">
              <span>{availableTicketCount > 0 ? '日時を選ぶ' : '空いている時間'}</span>
              <Link href="/customer/app/tickets" className="inline-flex min-h-14 items-center">チケット</Link>
            </h2>
            <div className="fitall-card overflow-hidden">
              <CustomerWeekCalendar
                availability={data.availability}
                availableTicketCount={availableTicketCount}
                bookingAction={data.preview ? undefined : createCustomerBookingAction}
                preview={data.preview}
              />
            </div>
            {availableTicketCount <= 0 && (
              <p className="fitall-group-note">チケットを購入すると、この画面から予約できます。</p>
            )}
          </section>

          <section aria-label="これからの予約">
            <h2 className="fitall-group-label">
              <span>これからの予約</span>
              <Link href="/customer/app/bookings/list" className="inline-flex min-h-14 items-center">変更・キャンセル</Link>
            </h2>
            {data.upcomingBookings.length ? (
              <div className="fitall-group">
                {data.upcomingBookings.map((booking) => (
                  <div key={booking.id} className="fitall-row" data-status={booking.status}>
                    <div className="fitall-row-main">
                      <p className="fitall-row-title">{formatDate(booking.scheduled_at)} {formatTime(booking.scheduled_at)}</p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="fitall-group px-5 py-5 text-base text-ink-muted">次回の予約はまだありません</div>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
