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
      <div className="w-full max-w-[390px] border border-ink bg-white p-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center border border-ink bg-accent text-ink">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <p className="mt-5 text-base font-bold text-brand">チケット</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-ink">
          チケットの購入手続き
        </h1>
        <p className="mt-3 text-base font-medium leading-relaxed text-ink-muted">
          決済完了後にチケットが反映されます。LINEを連携してマイページを開き、残りチケットを確認してから予約日時を選んでください。
        </p>
        {lineStatus && (
          <p className="mt-4 border border-line bg-surface-soft px-3 py-2 text-base font-bold text-ink">
            {lineStatus}
          </p>
        )}
        {sessionId && params?.line !== 'connected' && params?.line !== 'not-paid' && (
          <Link
            href={`/api/line/connect/start?session_id=${encodeURIComponent(sessionId)}`}
            className="mt-5 inline-flex h-[52px] w-full items-center justify-center border border-accent bg-accent px-6 text-base font-bold text-ink"
          >
            LINEを連携してマイページへ
          </Link>
        )}
        {params?.line === 'connected' ? (
          <Link
            href="/customer/app"
            className="mt-3 inline-flex h-12 w-full items-center justify-center border border-ink bg-ink px-6 text-base font-bold text-white"
          >
            お客様アプリを開く
          </Link>
        ) : (
          <Link
            href="/auth/login"
            className="mt-3 inline-flex h-12 w-full items-center justify-center border border-ink bg-white px-6 text-base font-bold text-ink"
          >
            閉じる
          </Link>
        )}
      </div>
    </div>
  )
}
