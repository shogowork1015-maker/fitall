import Link from 'next/link'
import { loadCustomerAppData } from '@/lib/customer-app'

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
  if (status === 'customer-only') return 'LINE通知はお客さん本人のマイページで連携します。'
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
    <main className="pb-28">
      <header className="sticky top-0 z-20 border-b-2 border-[#DDE8E8] bg-white/95 px-4 py-4 backdrop-blur">
        <p className="text-[10px] font-black tracking-[0.16em] text-[#087D78]">MY PAGE</p>
        <h1 className="mt-1 text-2xl font-black text-[#0A0A0A]">マイページ</h1>
      </header>

      {!data ? (
        <div className="px-4 py-6">
          <div className="fitall-card p-6 text-center text-sm font-black text-[#555555]">
            お客様情報が見つかりません
          </div>
        </div>
      ) : (
        <div className="space-y-4 px-4 py-5">
          {message && (
            <div className="border-2 border-[#DDE8E8] bg-[#F4F7F7] px-3 py-3 text-sm font-black text-[#0A0A0A]">
              {message}
            </div>
          )}

          <section className="fitall-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black text-[#087D78]">CUSTOMER</p>
                <h2 className="mt-1 text-xl font-black text-[#0A0A0A]">{data.customer.name}さん</h2>
                <p className="mt-1 break-all text-xs font-bold text-[#555555]">{data.customer.email}</p>
              </div>
              <span className="bg-[#E8FBFA] px-2 py-1 text-[10px] font-black text-[#087D78]">
                {data.viewer.canConnectLine ? '本人' : '確認用'}
              </span>
            </div>
            <div className="mt-3 border-t-2 border-[#DDE8E8] pt-3">
              <p className="text-[10px] font-black text-[#087D78]">GOAL</p>
              <p className="mt-1 text-sm font-black leading-relaxed text-[#0A0A0A]">{data.customer.goal}</p>
            </div>
            <div className="mt-3 border-t-2 border-[#DDE8E8] pt-3">
              <p className="text-[10px] font-black text-[#087D78]">TRAINER</p>
              <p className="mt-1 text-sm font-black text-[#0A0A0A]">{data.trainer.name}</p>
            </div>
          </section>

          <section className="fitall-card-strong overflow-hidden">
            <div className="bg-[#0A0A0A] px-4 py-5 text-white">
              <p className="text-[10px] font-black tracking-[0.12em] text-white/70">NOTIFICATION STATUS</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">
                    {data.customer.lineUserId ? 'LINE通知 ON' : 'LINE通知 OFF'}
                  </h2>
                  <p className="mt-1 text-sm font-bold text-white/80">
                    {data.customer.lineUserId
                      ? '予約とチケットの通知をLINEで受け取れます'
                      : '連携すると予約通知をLINEで受け取れます'}
                  </p>
                </div>
                <span className="h-12 w-12 border-2 border-white bg-[#12C7BE] text-center text-xl font-black leading-[44px] text-white">
                  {data.customer.lineUserId ? 'ON' : 'L'}
                </span>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div className="grid grid-cols-[1fr_auto] gap-3 border-2 border-[#DDE8E8] bg-white px-3 py-3">
                <div>
                  <p className="text-[10px] font-black text-[#087D78]">ACCOUNT</p>
                  <p className="mt-1 text-sm font-black text-[#0A0A0A]">{data.customer.name}さん</p>
                  <p className="mt-0.5 break-all text-xs font-bold text-[#555555]">{data.customer.email}</p>
                </div>
                <span className="self-start bg-[#E8FBFA] px-2 py-1 text-[10px] font-black text-[#087D78]">
                  {data.viewer.canConnectLine ? '本人' : 'プレビュー'}
                </span>
              </div>

              {data.customer.lineUserId ? (
                <div className="fitall-primary-action h-12 text-sm">連携済み</div>
              ) : data.viewer.canConnectLine ? (
                <a href="/api/line/customer-connect/start" className="fitall-aqua-action fitall-tap h-12 text-sm">
                  LINE通知を連携する
                </a>
              ) : (
                <div className="border-2 border-[#DDE8E8] bg-[#F4F7F7] px-3 py-3">
                  <p className="text-sm font-black text-[#0A0A0A]">
                    LINEの登録リンクからマイページを開くと連携できます。
                  </p>
                  <p className="mt-1 text-xs font-bold leading-relaxed text-[#555555]">
                    トレーナープレビューではLINEの紐づけは行いません。
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="fitall-card p-4">
            <h2 className="fitall-section-title">届く通知</h2>
            <div className="mt-3 grid gap-2">
              {notificationItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between border-2 border-[#DDE8E8] bg-white px-3 py-3">
                  <p className="text-sm font-black text-[#0A0A0A]">{item.label}</p>
                  <span
                    className={`px-2 py-1 text-[10px] font-black ${
                      item.status === '準備中'
                        ? 'bg-[#F4F7F7] text-[#555555]'
                        : 'bg-[#E8FBFA] text-[#087D78]'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="fitall-card p-4">
            <h2 className="fitall-section-title">よく使う操作</h2>
            <p className="mt-2 text-sm font-bold leading-relaxed text-[#555555]">
              予約とチケットはここからすぐ確認できます。iPhoneではホーム画面に追加して使えます。
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/customer/app/bookings" className="fitall-primary-action fitall-tap h-11 text-xs">
                予約を見る
              </Link>
              <Link href="/customer/app/tickets" className="fitall-secondary-action fitall-tap h-11 text-xs">
                チケットを見る
              </Link>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
