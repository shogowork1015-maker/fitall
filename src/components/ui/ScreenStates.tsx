import Link from 'next/link'

// 読み込み中の骨組み。実際の画面に近い形を見せて、待ち時間を短く感じさせる
export function LoadingScreen() {
  return (
    <div role="status" aria-label="読み込み中" className="fitall-loading-screen mx-auto w-full max-w-[640px] space-y-4 px-4 pt-6">
      <span className="sr-only">読み込み中です</span>
      <div className="fitall-skeleton h-8 w-32" />
      <div className="fitall-skeleton h-44 w-full rounded-card" />
      <div className="grid grid-cols-2 gap-3">
        <div className="fitall-skeleton h-28 rounded-card" />
        <div className="fitall-skeleton h-28 rounded-card" />
      </div>
      <div className="fitall-skeleton h-20 w-full rounded-card" />
      <div className="fitall-skeleton h-20 w-full rounded-card" />
    </div>
  )
}

// 想定外のエラー画面。再試行と、安全な場所へ戻る導線を必ず出す
export function ErrorScreen({ onRetry, homeHref, homeLabel = 'ホームへ戻る' }: {
  onRetry: () => void
  homeHref: string
  homeLabel?: string
}) {
  return (
    <div role="alert" className="mx-auto flex min-h-[60dvh] w-full max-w-[480px] flex-col justify-center gap-3 px-4 py-8 text-center">
      <p aria-hidden="true" className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-2xl font-black text-danger">!</p>
      <h1 className="mt-2 text-xl font-black text-ink">画面を表示できませんでした</h1>
      <p className="leading-relaxed text-ink-muted">通信状況を確認して、もう一度お試しください。</p>
      <button type="button" onClick={onRetry} className="fitall-primary-action mt-3">もう一度読み込む</button>
      <Link href={homeHref} className="fitall-secondary-action">{homeLabel}</Link>
    </div>
  )
}
