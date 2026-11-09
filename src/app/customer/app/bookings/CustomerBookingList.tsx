'use client'

import { useState } from 'react'
import type { CustomerBooking } from '@/lib/customer-app'
import { formatJstDate, formatJstTime } from '@/lib/datetime'
import { Screen, IconLink, Note } from '@/ui/Screen'
import { Banner, Empty, statusText } from '@/ui/List'
import { Segmented } from '@/ui/Segmented'
import { Sheet } from '@/ui/Sheet'
import { DateList, DateRow } from '@/ui/DateList'
import { addMinutes } from '@/ui/Timeline'
import { Plus } from '@/ui/icons'
import { BookingManagement } from './BookingManagement'

type Tab = 'upcoming' | 'past'


// 予約タブ（A案）。日付を左に大きく並べる。トレーナーの確認待ちだけアクア。
// 押すと下からシートが出て、日時の変更・キャンセルができる
export function CustomerBookingList({ upcomingBookings, pastBookings = [], managementEnabled = false, sessionMinutes = 60 }: {
  upcomingBookings: CustomerBooking[]; pastBookings?: CustomerBooking[]; managementEnabled?: boolean; sessionMinutes?: number
}) {
  const [tab, setTab] = useState<Tab>('upcoming')
  const [openId, setOpenId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const upcoming = upcomingBookings.filter((booking) => ['pending', 'confirmed'].includes(booking.status))
    .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at))
  const past = [...pastBookings].sort((a, b) => Date.parse(b.scheduled_at) - Date.parse(a.scheduled_at))
  const list = tab === 'upcoming' ? upcoming : past
  const opened = [...upcoming, ...past].find((booking) => booking.id === openId)

  return (
    <Screen
      caption="変更は前日まで"
      title="予約"
      actions={<IconLink href="/customer/app/bookings" label="予約する"><Plus /></IconLink>}
    >
      <Segmented
        label="表示する予約"
        value={tab}
        onChange={setTab}
        options={[{ value: 'upcoming', label: 'これから' }, { value: 'past', label: 'これまで' }]}
      />

      {notice ? <Banner>{notice}</Banner> : null}

      <div style={{ marginTop: 10 }}>
        {list.length ? (
          <DateList>
            {list.map((booking) => {
              const start = formatJstTime(booking.scheduled_at)
              const pending = booking.status === 'pending'
              return (
                <DateRow
                  key={booking.id}
                  onClick={() => setOpenId(booking.id)}
                  day={formatJstDate(booking.scheduled_at, { day: 'numeric' }).replace('日', '')}
                  sub={`${formatJstDate(booking.scheduled_at, { month: 'numeric' })}・${formatJstDate(booking.scheduled_at, { weekday: 'short' })}`}
                  title={`${start}〜${addMinutes(start, sessionMinutes)}`}
                  meta={pending ? 'トレーナーの確認待ち' : `パーソナル${sessionMinutes}分`}
                  right={tab === 'past' ? statusText(booking.status) : undefined}
                  action={pending}
                  chevron
                />
              )
            })}
          </DateList>
        ) : <Empty>{tab === 'upcoming' ? 'これからの予約はありません' : 'これまでの予約はありません'}</Empty>}
      </div>

      {tab === 'upcoming' ? <Note>開始の24時間前まで、日時の変更と<br />キャンセルができます。</Note> : null}
      {!managementEnabled ? <Note>確認モード（変更・キャンセルはできません）</Note> : null}

      <Sheet open={Boolean(opened)} onClose={() => setOpenId(null)} title="予約の詳細">
        {opened ? (
          <BookingManagement
            key={`${opened.id}-${opened.scheduled_at}-${opened.status}`}
            booking={opened}
            enabled={managementEnabled}
            onSuccess={(message) => { setNotice(message); setOpenId(null) }}
          />
        ) : null}
      </Sheet>
    </Screen>
  )
}
