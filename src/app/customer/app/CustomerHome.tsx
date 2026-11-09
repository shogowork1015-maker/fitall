import type { CustomerAppData } from '@/lib/customer-app'
import { formatJstDate, formatJstTime } from '@/lib/datetime'
import { Screen, Note } from '@/ui/Screen'
import { Section, Empty } from '@/ui/List'
import { Button } from '@/ui/Button'
import { TicketCard } from '@/ui/TicketCard'
import { DateList, DateRow } from '@/ui/DateList'
import { addMinutes } from '@/ui/Timeline'

type HomeData = Pick<CustomerAppData, 'customer' | 'trainer' | 'tickets' | 'upcomingBookings'> & { preview?: boolean; sessionMinutes?: number }

// 呼びかけは下の名前だけ（「佐藤 花子」→「花子」）。空白がなければそのまま
function firstName(name: string) {
  const parts = name.trim().split(/[\s\u3000]+/)
  return parts.length > 1 ? parts[parts.length - 1]! : name
}

// お客様のホーム（A案）。
// 主役：チケット（黒い面）。残り回数と「予約する」ボタン1つ。その下にこれからの予約
export function CustomerHome({ data }: { data: HomeData }) {
  const remaining = data.tickets.reduce((sum, ticket) => sum + ticket.remaining, 0)
  const scheduled = data.tickets.reduce((sum, ticket) => sum + ticket.scheduled, 0)
  const used = data.tickets.reduce((sum, ticket) => sum + ticket.used, 0)
  const total = data.tickets.reduce((sum, ticket) => sum + ticket.total, 0)
  const title = data.tickets.length === 1 ? data.tickets[0]!.title : data.tickets.length ? 'チケット' : 'チケットがありません'
  const upcoming = data.upcomingBookings
    .filter((booking) => booking.status === 'pending' || booking.status === 'confirmed')
    .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at))
  const now = new Date()
  const today = `${formatJstDate(now, { month: 'long', day: 'numeric' })} ${formatJstDate(now, { weekday: 'long' })}`
  const minutes = data.sessionMinutes ?? 60

  return (
    <Screen caption={today} title={`${firstName(data.customer.name)}さん`}>
      <TicketCard title={title} right={`担当 ${data.trainer.name}`} remaining={remaining} scheduled={scheduled} used={used} total={total}>
        {remaining > 0
          ? <Button variant="aqua" href="/customer/app/bookings">予約する</Button>
          : <Button variant="aqua" href="/customer/app/tickets">チケットを買う</Button>}
      </TicketCard>

      <Section title="これからの予約" action={upcoming.length ? `${upcoming.length}件` : undefined}>
        {upcoming.length ? (
          <DateList>
            {upcoming.map((booking) => {
              const start = formatJstTime(booking.scheduled_at)
              const pending = booking.status === 'pending'
              return (
                <DateRow
                  key={booking.id}
                  href="/customer/app/bookings/list"
                  day={formatJstDate(booking.scheduled_at, { day: 'numeric' }).replace('日', '')}
                  sub={`${formatJstDate(booking.scheduled_at, { month: 'numeric' })}・${formatJstDate(booking.scheduled_at, { weekday: 'short' })}`}
                  title={`${start}〜${addMinutes(start, minutes)}`}
                  meta={pending ? 'トレーナーの確認待ち' : `パーソナル${minutes}分`}
                  right={pending ? undefined : '確定'}
                  action={pending}
                />
              )
            })}
          </DateList>
        ) : <Empty>まだ予約はありません</Empty>}
      </Section>

      {data.preview ? <Note>確認モード（サンプル表示）</Note> : null}
    </Screen>
  )
}
