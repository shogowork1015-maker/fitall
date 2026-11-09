'use client'

import { useEffect, useState } from 'react'
import { Section, Row } from '@/ui/List'
import { Button, Buttons } from '@/ui/Button'
import { Copy, LinkIcon } from '@/ui/icons'
import s from '@/ui/ui.module.css'

const MESSAGE = 'Limitless Appでチケットの購入と予約ができます。購入後はLINEで予約のお知らせも届きます。'

// LINE招待（A案）。お客様に届くメッセージをそのまま見せて、ボタン1つで送る
export function BookingLinkManager({ trainerProfileId }: { trainerProfileId: string }) {
  const [copied, setCopied] = useState<'url' | 'message' | null>(null)
  const [origin, setOrigin] = useState('')
  const bookingPath = `/book/${trainerProfileId}`

  // 表示用の住所はブラウザで開いたときの住所に合わせる
  useEffect(() => {
    const id = window.setTimeout(() => setOrigin(window.location.origin), 0)
    return () => window.clearTimeout(id)
  }, [])

  const bookingUrl = () => `${window.location.origin}${bookingPath}`
  const message = () => `${MESSAGE}\n${bookingUrl()}`

  async function copy(kind: 'url' | 'message') {
    try {
      await navigator.clipboard.writeText(kind === 'url' ? bookingUrl() : message())
      setCopied(kind)
    } catch {
      setCopied(null)
    }
  }

  function shareLine() {
    window.open(`https://social-plugins.line.me/lineit/share?text=${encodeURIComponent(message())}`, '_blank')
  }

  return (
    <>
      <div className={s.bubbleCard}>
        <p className={s.bubbleFrom}>お客様に届くメッセージ</p>
        <p className={s.bubble}>
          {MESSAGE}
          {'\n'}
          <span className={s.bubbleLink}>{`${origin.replace(/^https?:\/\//, '')}${bookingPath}`}</span>
        </p>
      </div>

      <Buttons>
        <Button onClick={shareLine}>LINEで招待を送る</Button>
      </Buttons>

      <div style={{ marginTop: 12 }}>
        <Section group>
          <Row onClick={() => copy('url')} title={<span style={{ alignItems: 'center', display: 'inline-flex', gap: 10 }}><LinkIcon />リンクをコピー</span>} value={copied === 'url' ? 'コピーしました' : undefined} chevron={false} />
          <Row onClick={() => copy('message')} title={<span style={{ alignItems: 'center', display: 'inline-flex', gap: 10 }}><Copy />招待文をコピー</span>} value={copied === 'message' ? 'コピーしました' : undefined} chevron={false} />
        </Section>
      </div>
    </>
  )
}
