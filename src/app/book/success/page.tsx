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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="fitall-card w-full max-w-[390px] p-6 text-center">
        <div className="fitall-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-ink">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className="mt-5 text-2xl font-bold text-ink">
          チケットの購入手続き
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-muted">
          決済完了後にチケットが反映されます。LINEを連携してマイページを開き、残りチケットを確認してから予約日時を選んでください。
        </p>
        {lineStatus && (
          <p role="status" className="mt-4 rounded-control bg-surface-soft px-4 py-3 text-base font-semibold text-ink">
            {lineStatus}
          </p>
        )}
        {sessionId && params?.line !== 'connected' && params?.line !== 'not-paid' && (
          <Link
            href={`/api/line/connect/start?session_id=${encodeURIComponent(sessionId)}`}
            className="fitall-aqua-action mt-5"
          >
            LINEを連携してマイページへ
          </Link>
        )}
        {params?.line === 'connected' ? (
          <Link
            href="/customer/app"
            className="fitall-primary-action mt-3"
          >
            お客様アプリを開く
          </Link>
        ) : (
          <Link
            href="/auth/login"
            className="fitall-secondary-action mt-3 w-full"
          >
            閉じる
          </Link>
        )}
      </div>
    </div>
  )
}
