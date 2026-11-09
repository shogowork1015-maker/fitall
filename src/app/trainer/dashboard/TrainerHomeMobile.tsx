import { formatJstTime } from '@/lib/datetime'
import { Screen, IconLink, Note } from '@/ui/Screen'
import { Section, Banner, Empty } from '@/ui/List'
import { Card, CardTop, CardBig, CardName, CardSub, Pill, Progress } from '@/ui/Card'
import { Timeline, Slot, Gap, addMinutes, gapLabel, freeAfterLabel } from '@/ui/Timeline'
import { Gear, Plus } from '@/ui/icons'
import { ApproveButton } from '@/app/trainer/bookings/ApproveButton'
import { sessionLabel } from '@/lib/ticket-summary'

export type HomeBooking = {
  id: string
  scheduled_at: string
  status: string
  trainee_name: string
  price?: number | null
  /** このお客様のチケットの残り（分からないときは null） */
  remaining?: number | null
  /** はじめての予約かどうか */
  first_time?: boolean
}

function yen(amount: number) {
  return `¥${amount.toLocaleString()}`
}

function pendingText(booking: HomeBooking) {
  return booking.first_time ? '承認待ち ・ はじめて' : '承認待ち'
}

// 表示した時点の時刻（次のセッションまでの残り時間に使う）
function currentTime() {
  return Date.now()
}

function untilLabel(start: number, now: number) {
  const minutes = Math.round((start - now) / 60000)
  if (minutes <= 0) return 'セッション中'
  if (minutes < 60) return `あと${minutes}分`
  const hours = Math.floor(minutes / 60)
  return `あと${hours}時間${minutes % 60 ? `${minutes % 60}分` : ''}`
}

// トレーナーのホーム（A案）。
// 主役：次のセッション（黒い面）。その下に今日を時間の流れで並べる。対応が必要な予約だけアクア
export function TrainerHomeMobile({
  todayLabel,
  salesError,
  todayBookings,
  sessionMinutes = 60,
  closeTime = '21:00',
  preview = false,
}: {
  todayLabel: string
  monthLabel: string
  totalSales: number | null
  salesError?: string
  clientCount: number
  pendingCount: number
  todayBookings: HomeBooking[]
  sessionMinutes?: number
  closeTime?: string
  preview?: boolean
}) {
  const now = currentTime()
  const SESSION_MINUTES = sessionMinutes
  const menu = sessionLabel(sessionMinutes)
  const list = todayBookings
    .filter((booking) => booking.status !== 'cancelled' && booking.status !== 'rejected')
    .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at))
  const endOf = (booking: HomeBooking) => Date.parse(booking.scheduled_at) + SESSION_MINUTES * 60000
  const next = list.find((booking) => endOf(booking) > now)
  const doneCount = list.filter((booking) => endOf(booking) <= now).length

  return (
    <Screen
      caption={todayLabel}
      title="今日"
      actions={(
        <>
          <IconLink href="/trainer/settings" label="設定"><Gear /></IconLink>
          <IconLink href="/trainer/bookings" label="予約を入れる"><Plus /></IconLink>
        </>
      )}
    >
      <Card label="次のセッション">
        <CardTop left="次のセッション" right={next ? <Pill>{untilLabel(Date.parse(next.scheduled_at), now)}</Pill> : undefined} />
        {next ? (
          <>
            <CardBig value={formatJstTime(next.scheduled_at)} />
            <CardName>{next.trainee_name}さん</CardName>
            <CardSub>{next.status === 'pending' ? pendingText(next) : typeof next.remaining === 'number' ? `${menu} ・ チケット残り${next.remaining}回` : menu}</CardSub>
          </>
        ) : (
          <>
            <CardName>{list.length ? '今日はすべて終わりました' : '今日の予約はありません'}</CardName>
            <CardSub>これからの予約は「予約」で確認できます</CardSub>
          </>
        )}
        <Progress total={list.length} done={doneCount} />
      </Card>

      <Section title="今日の流れ" action={list.length ? `${list.length}件` : undefined} label="今日の流れ">
        {list.length ? (
          <Timeline>
            {list.map((booking, index) => {
              const start = formatJstTime(booking.scheduled_at)
              const end = addMinutes(start, SESSION_MINUTES)
              const following = list[index + 1]
              const gap = following ? gapLabel(end, formatJstTime(following.scheduled_at)) : freeAfterLabel(end, closeTime)
              const done = endOf(booking) <= now
              const pending = booking.status === 'pending'
              return (
                <div key={booking.id}>
                  <Slot
                    time={start}
                    end={end}
                    name={`${booking.trainee_name}さん`}
                    meta={pending ? pendingText(booking) : done ? '終わりました' : typeof booking.remaining === 'number' ? `${menu} ・ 残り${booking.remaining}回` : booking.price ? `${menu} ・ ${yen(booking.price)}` : menu}
                    tone={pending ? 'action' : done ? 'done' : 'normal'}
                    right={pending ? <ApproveButton bookingId={booking.id} preview={preview} /> : undefined}
                    href={pending ? undefined : '/trainer/bookings'}
                  />
                  {gap ? <Gap>{gap}</Gap> : null}
                </div>
              )
            })}
          </Timeline>
        ) : <Empty>今日の予約はありません</Empty>}
      </Section>

      {salesError ? <Banner tone="error">{salesError}</Banner> : null}

      {preview ? <Note>確認モード（サンプル表示・保存されません）</Note> : null}
    </Screen>
  )
}
