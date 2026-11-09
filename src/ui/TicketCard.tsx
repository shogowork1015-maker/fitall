import type { ReactNode } from 'react'
import { Card, CardBig, CardFoot, CardTop, CardSub, Punches, CardAction } from './Card'

// チケット。黒い面に残り回数を大きく出し、使った回は穴で見せる
export function TicketCard({ title, right, remaining, scheduled, used, total, note, foot, children }: {
  title: string
  right?: ReactNode
  remaining: number
  scheduled: number
  used: number
  total: number
  /** 穴の下の1行（例：次回 11月10日（火）10:00） */
  note?: ReactNode
  foot?: { label: string; value: ReactNode }[]
  /** 黒い面の中に置くボタン */
  children?: ReactNode
}) {
  return (
    <Card label={`${title} 残り${remaining}回`}>
      <CardTop left={title} right={right} />
      <CardBig value={remaining} unit="回" of={total > 0 ? `／ ${total}回` : undefined} />
      <Punches total={total} used={used} booked={scheduled} />
      {note ? <CardSub>{note}</CardSub> : null}
      {foot ? <CardFoot items={foot} /> : null}
      {children ? <CardAction>{children}</CardAction> : null}
    </Card>
  )
}
