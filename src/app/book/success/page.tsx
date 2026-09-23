import Link from 'next/link'

interface PageProps {
  searchParams?: Promise<{
    session_id?: string
    line?: string
  }>
}

function lineStatusMessage(status?: string) {
  if (status === 'connected') return 'LINE通知の連携が完了しました。'
  if (status === 'setup-required') return 'LINE連携の設定が未完了です。トレーナーへ直接ご連絡ください。'
  if (status === 'failed') return 'LINE連携に失敗しました。あとで再度お試しください。'
  if (status === 'missing-email') return '決済情報のメールアドレスを確認できませんでした。'
  if (status === 'not-paid') return '決済完了後にLINE連携できます。'
  return null
}

export default async function PublicBookingSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams
  const sessionId = params?.session_id
  const lineStatus = lineStatusMessage(params?.line)

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-[390px] border-2 border-[#0A0A0A] bg-white p-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center border-2 border-[#0A0A0A] bg-[#12C7BE] text-white">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <p className="mt-5 text-[10px] font-black tracking-[0.16em] text-[#087D78]">PAYMENT COMPLETE</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-[#0A0A0A]">
          予約を受け付けました
        </h1>
        <p className="mt-3 text-sm font-medium leading-relaxed text-[#666666]">
          トレーナーの管理画面に予約が反映されます。LINE通知を連携すると、予約確認やリマインドを受け取れます。
        </p>
        {lineStatus && (
          <p className="mt-4 border-2 border-[#DDE8E8] bg-[#F4F7F7] px-3 py-2 text-xs font-bold text-[#0A0A0A]">
            {lineStatus}
          </p>
        )}
        {sessionId && params?.line !== 'connected' && params?.line !== 'not-paid' && (
          <Link
            href={`/api/line/connect/start?session_id=${encodeURIComponent(sessionId)}`}
            className="mt-5 inline-flex h-[52px] w-full items-center justify-center border-2 border-[#12C7BE] bg-[#12C7BE] px-6 text-sm font-black text-white"
          >
            LINE通知を受け取る
          </Link>
        )}
        {params?.line === 'connected' ? (
          <Link
            href="/customer/app"
            className="mt-3 inline-flex h-12 w-full items-center justify-center border-2 border-[#0A0A0A] bg-[#0A0A0A] px-6 text-sm font-bold text-white"
          >
            お客様アプリを開く
          </Link>
        ) : (
          <Link
            href="/auth/login"
            className="mt-3 inline-flex h-12 w-full items-center justify-center border-2 border-[#0A0A0A] bg-white px-6 text-sm font-bold text-[#0A0A0A]"
          >
            閉じる
          </Link>
        )}
      </div>
    </div>
  )
}
