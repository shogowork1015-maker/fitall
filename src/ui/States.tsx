'use client'

import s from './ui.module.css'
import { Button, Buttons } from './Button'

// 読み込み中。実際の画面（見出し・黒い面・一覧）と同じ形の骨組みを見せる
export function LoadingSkeleton() {
  return (
    <div className={s.screen} role="status" aria-label="読み込み中">
      <div className={s.header}>
        <div className={s.headerTop}><div className={s.skeleton} style={{ height: 16, width: 110 }} /></div>
        <div className={s.skeleton} style={{ height: 36, width: 150 }} />
      </div>
      <div className={s.skeleton} style={{ borderRadius: 26, height: 200, margin: '16px 16px 0' }} />
      <div className={s.skeleton} style={{ height: 64, margin: '26px 16px 0' }} />
      <div className={s.skeleton} style={{ height: 64, margin: '10px 16px 0' }} />
    </div>
  )
}

// 想定外のエラー。もう一度読み込むか、ホームへ戻れるようにする
export function ErrorState({ onRetry, homeHref }: { onRetry: () => void; homeHref: string }) {
  return (
    <div className={s.screen}>
      <div className={s.state} role="alert">
        <p className={s.stateTitle}>表示できませんでした</p>
        <p className={s.stateText}>通信状況を確認して、もう一度お試しください。</p>
        <div style={{ width: '100%' }}>
          <Buttons>
            <Button onClick={onRetry}>もう一度読み込む</Button>
            <Button variant="secondary" href={homeHref}>ホームへ戻る</Button>
          </Buttons>
        </div>
      </div>
    </div>
  )
}
