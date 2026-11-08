import Link from 'next/link'
import { loadCustomerAppData } from '@/lib/customer-app'
import { DevPreviewNote, PageHeader } from '@/components/ui/PageHeader'
import { CalendarIcon, ChevronRightIcon, TicketIcon } from '@/components/ui/Icons'

interface PageProps {
  searchParams?: Promise<{
    line?: string
  }>
}

function statusMessage(status?: string) {
  if (status === 'connected') return 'LINE通知を連携しました。'
  if (status === 'setup-required') return 'LINE連携の設定がまだ完了していません。'
  if (status === 'failed') return 'LINE連携に失敗しました。もう一度お試しください。'
  if (status === 'login-required') return 'LINEの登録リンクからマイページを開くと連携できます。'
  if (status === 'customer-only') return 'LINE通知はお客様本人のマイページで連携します。'
  return null
}

const notificationItems = [
  { label: '予約確定', status: '自動' },
  { label: '前日リマインド', status: '自動' },
  { label: '予約変更の相談', status: '手動' },
  { label: 'チケット追加の案内', status: '自動' },
]

export default async function CustomerMyPage({ searchParams }: PageProps) {
  const params = await searchParams
  const data = await loadCustomerAppData()
  const message = statusMessage(params?.line)

  return (
    <main>
      <PageHeader title="マイページ" />

      {!data ? (
        <div className="fitall-page-pad">
          <div className="fitall-card p-6 text-center text-base text-ink-muted">
            お客様情報が見つかりません
          </div>
        </div>
      ) : (
        <div className="fitall-page-pad space-y-7">
          {data.preview && <DevPreviewNote>開発用の確認モード（サンプル表示）</DevPreviewNote>}
          {message && (
            <p role="status" className="rounded-control bg-accent-soft px-4 py-3 text-base font-semibold text-brand">
              {message}
            </p>
          )}

          <section className="fitall-card flex items-center gap-4 p-5">
            <span className="fitall-avatar !h-16 !w-16 !text-2xl">{data.customer.name[0] ?? '?'}</span>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-ink">{data.customer.name}さん</h2>
              <p className="mt-0.5 break-all text-base text-ink-muted">{data.customer.email}</p>
            </div>
          </section>

          <section className="fitall-group">
            <div className="fitall-row">
              <span className="fitall-row-main text-base text-ink-muted">目標</span>
              <span className="text-right text-base font-semibold text-ink">{data.customer.goal}</span>
            </div>
            <div className="fitall-row">
              <span className="fitall-row-main text-base text-ink-muted">担当トレーナー</span>
              <span className="text-right text-base font-semibold text-ink">{data.trainer.name}</span>
            </div>
          </section>

          <section>
            <h2 className="fitall-group-label">LINE通知</h2>
            <div className="fitall-group">
              <div className="fitall-row">
                <span className="fitall-icon-tile" data-tone={data.customer.lineUserId ? 'accent' : undefined}><BellIcon /></span>
                <div className="fitall-row-main">
                  <p className="fitall-row-title">{data.customer.lineUserId ? '受け取る設定です' : 'まだ連携していません'}</p>
                  <p className="fitall-row-meta">
                    {data.customer.lineUserId ? '予約とチケットのお知らせがLINEに届きます' : '連携すると予約のお知らせがLINEに届きます'}
                  </p>
                </div>
                <span className="fitall-badge" data-tone={data.customer.lineUserId ? 'accent' : undefined}>
                  {data.customer.lineUserId ? 'ON' : 'OFF'}
                </span>
              </div>
              {notificationItems.map((item) => (
                <div key={item.label} className="fitall-row">
                  <span className="fitall-row-main text-base text-ink">{item.label}</span>
                  <span className="text-base text-ink-muted">{item.status}</span>
                </div>
              ))}
            </div>
            {!data.customer.lineUserId && (
              data.viewer.canConnectLine ? (
                <a href="/api/line/customer-connect/start" className="fitall-aqua-action mt-3">
                  LINE通知を連携する
                </a>
              ) : (
                <p className="fitall-group-note">
                  LINEの登録リンクからマイページを開くと連携できます。
                </p>
              )
            )}
          </section>

          <section>
            <h2 className="fitall-group-label">よく使う操作</h2>
            <div className="fitall-group">
              <Link href="/customer/app/bookings" className="fitall-row">
                <span className="fitall-icon-tile" data-tone="accent"><CalendarIcon /></span>
                <span className="fitall-row-main fitall-row-title">予約する</span>
                <ChevronRightIcon />
              </Link>
              <Link href="/customer/app/tickets" className="fitall-row">
                <span className="fitall-icon-tile" data-tone="accent"><TicketIcon /></span>
                <span className="fitall-row-main fitall-row-title">チケットを見る</span>
                <ChevronRightIcon />
              </Link>
            </div>
            <p className="fitall-group-note">iPhoneではホーム画面に追加すると、アプリのように使えます。</p>
          </section>
        </div>
      )}
    </main>
  )
}

function BellIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}
