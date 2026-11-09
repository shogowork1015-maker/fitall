import { Button } from '@/ui/Button'
import { Banner } from '@/ui/List'
import { Check } from '@/ui/icons'
import s from '@/ui/ui.module.css'

interface PageProps {
  searchParams?: Promise<{
    session_id?: string
    line?: string
  }>
}

function lineStatusMessage(status?: string): { tone: 'info' | 'error'; text: string } | null {
  if (status === 'connected') return { tone: 'info', text: 'LINE通知の連携が完了しました。' }
  if (status === 'setup-required') return { tone: 'error', text: 'LINE連携の設定が未完了です。トレーナーへ直接ご連絡ください。' }
  if (status === 'failed') return { tone: 'error', text: 'LINE連携に失敗しました。あとで再度お試しください。' }
  if (status === 'missing-email') return { tone: 'error', text: '決済情報のメールアドレスを確認できませんでした。' }
  if (status === 'not-paid') return { tone: 'error', text: '決済完了後にLINE連携できます。' }
  return null
}

// チケット購入のあと。LINEを連携してマイページへ進んでもらう
export default async function PublicBookingSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams
  const sessionId = params?.session_id
  const lineStatus = lineStatusMessage(params?.line)
  const canConnect = sessionId && params?.line !== 'connected' && params?.line !== 'not-paid'

  return (
    <div className={s.screen}>
      <main className={s.state}>
        <span style={{ alignItems: 'center', background: 'var(--ui-tint)', borderRadius: 999, color: '#fff', display: 'inline-flex', height: 64, justifyContent: 'center', marginBottom: 12, width: 64 }}>
          <Check />
        </span>
        <h1 className={s.stateTitle}>お支払いを受け付けました</h1>
        <p className={s.stateText}>決済が完了するとチケットが追加されます。LINEを連携すると、マイページから予約できます。</p>
        {lineStatus ? <div style={{ marginBottom: 16, width: '100%' }}><Banner tone={lineStatus.tone}>{lineStatus.text}</Banner></div> : null}
        <div style={{ display: 'grid', gap: 10, width: '100%' }}>
          {params?.line === 'connected'
            ? <Button href="/customer/app">マイページを開く</Button>
            : canConnect
              ? <Button href={`/api/line/connect/start?session_id=${encodeURIComponent(sessionId)}`}>LINEを連携してマイページへ</Button>
              : null}
          {params?.line !== 'connected' ? <Button variant="secondary" href="/">閉じる</Button> : null}
        </div>
      </main>
    </div>
  )
}
