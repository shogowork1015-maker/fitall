import Link from 'next/link'
import type { ComponentProps } from 'react'
import { PublicBookingForm } from './PublicBookingForm'
import { Banner } from '@/ui/List'
import s from '@/ui/ui.module.css'

// LINEの招待から開く、はじめてのチケット購入の入口
export function BookingPageContent({ data, checkoutAction, cancelled = false }: ComponentProps<typeof PublicBookingForm> & { cancelled?: boolean }) {
  return (
    <div className={s.screen}>
      <main className={s.entry} style={{ paddingTop: 'calc(var(--ui-safe-top) + 40px)' }}>
        <span className={s.wordmark}>Limitless</span>
        <h1 className={s.entryTitle}>{data.trainer.name}さんの<br />チケット</h1>
        <p className={s.entryLead}>先にチケットを買って、好きな日時に予約できます。</p>

        {cancelled ? <div style={{ marginTop: 20 }}><Banner tone="error">購入をキャンセルしました。チケットは追加されていません。</Banner></div> : null}

        <PublicBookingForm data={data} checkoutAction={checkoutAction} />

        <p className={s.entryLinks}>
          チケットをお持ちの方は<Link href="/customer/app/bookings">予約へ</Link>
        </p>
      </main>
    </div>
  )
}
