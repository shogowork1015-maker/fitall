'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  addDaysToDateKey,
  dayOfWeekForDateKey,
  formatJstDate,
  formatJstDateKey,
  formatJstTime,
} from '@/lib/datetime'
import { Screen, IconButton, Note } from '@/ui/Screen'
import { Section, Banner, Empty } from '@/ui/List'
import { Button, Buttons } from '@/ui/Button'
import { Sheet } from '@/ui/Sheet'
import { Week, WeekLine } from '@/ui/Week'
import { Timeline, Slot, Gap, addMinutes, gapLabel, freeAfterLabel } from '@/ui/Timeline'
import { ChevronRight, Plus } from '@/ui/icons'
import { sessionLabel } from '@/lib/ticket-summary'
import { BookingSheet, type TrainerBooking } from './BookingSheet'
import { NewBookingSheet, type ClientOption, type MenuOption } from './NewBookingSheet'
import { ApproveButton } from './ApproveButton'
import b from './bookings.module.css'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
// 週の帯は、2週前から8週先までを横にめくれるようにする
const WEEKS_BEFORE = 2
const WEEKS_AFTER = 8

function yen(amount: number) {
  return `¥${amount.toLocaleString()}`
}

function dateFromKey(key: string) {
  return new Date(`${key}T00:00:00+09:00`)
}

// 予約タブ（A案）。週の帯で日を選び、その日を時間の流れで見る。
// 対応が必要な予約（承認待ち）だけアクアで塗る
export function TrainerBookings({ bookings, clients, menus, sessionMinutes = 60, closeTime = '21:00', preview = false }: {
  bookings: TrainerBooking[]
  clients: ClientOption[]
  menus: MenuOption[]
  sessionMinutes?: number
  closeTime?: string
  preview?: boolean
}) {
  const todayKey = formatJstDateKey()
  const [selectedKey, setSelectedKey] = useState(todayKey)
  const weekStrip = useRef<HTMLDivElement>(null)
  const menu = sessionLabel(sessionMinutes)
  const [openId, setOpenId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const byDay = useMemo(() => {
    const map: Record<string, TrainerBooking[]> = {}
    for (const booking of bookings) {
      if (booking.status === 'cancelled') continue
      const key = formatJstDateKey(booking.scheduled_at)
      ;(map[key] ??= []).push(booking)
    }
    for (const list of Object.values(map)) list.sort((x, y) => Date.parse(x.scheduled_at) - Date.parse(y.scheduled_at))
    return map
  }, [bookings])

  const weekStart = addDaysToDateKey(selectedKey, -dayOfWeekForDateKey(selectedKey))
  const weekKeys = Array.from({ length: 7 }, (_, index) => addDaysToDateKey(weekStart, index))
  const firstDay = addDaysToDateKey(todayKey, -dayOfWeekForDateKey(todayKey) - WEEKS_BEFORE * 7)
  const stripKeys = Array.from({ length: (WEEKS_BEFORE + WEEKS_AFTER + 1) * 7 }, (_, index) => addDaysToDateKey(firstDay, index))
  const weekCount = weekKeys.reduce((sum, key) => sum + (byDay[key]?.length ?? 0), 0)
  const pending = bookings
    .filter((booking) => booking.status === 'pending' && formatJstDateKey(booking.scheduled_at) >= todayKey)
    .sort((x, y) => Date.parse(x.scheduled_at) - Date.parse(y.scheduled_at))
  const dayBookings = byDay[selectedKey] ?? []
  const opened = bookings.find((booking) => booking.id === openId) ?? null

  // 選んだ日の週が、週の帯の左端に来るようにめくる
  useEffect(() => {
    const strip = weekStrip.current?.firstElementChild as HTMLElement | null
    const first = strip?.querySelector<HTMLElement>(`[data-key="${weekStart}"]`)
    if (strip && first) strip.scrollTo({ left: first.offsetLeft - strip.offsetLeft - 12, behavior: 'smooth' })
  }, [weekStart])

  function done(message: string) {
    setOpenId(null)
    setNewOpen(false)
    setNotice(message)
  }

  return (
    <Screen
      caption={formatJstDate(dateFromKey(selectedKey), { year: 'numeric', month: 'long' })}
      title="予約"
      actions={<IconButton onClick={() => setNewOpen(true)} label="予約を入れる"><Plus /></IconButton>}
    >
      {notice ? <Banner>{notice}</Banner> : null}

      <div ref={weekStrip}>
      <Week
        scroll
        days={stripKeys.map((key) => ({
          key,
          weekday: WEEKDAYS[dayOfWeekForDateKey(key)]!,
          day: Number(key.slice(8, 10)),
          empty: !(byDay[key]?.length),
          label: `${formatJstDate(dateFromKey(key), { month: 'long', day: 'numeric', weekday: 'short' })} 予約${byDay[key]?.length ?? 0}件`,
        }))}
        selected={selectedKey}
        onSelect={setSelectedKey}
        label="日付（横にめくると別の週）"
      />
      </div>
      <WeekLine
        left={(
          <>
            {weekKeys.includes(todayKey) ? '今週' : 'この週'} <b>{weekCount}件</b>
            {pending.length ? (
              <> ・ <button type="button" className={b.lineButton} onClick={() => setSelectedKey(formatJstDateKey(pending[0]!.scheduled_at))}>承認待ち <b>{pending.length}件</b></button></>
            ) : null}
          </>
        )}
        right={<Link href="/trainer/availability" className={b.lineLink}>空き時間<ChevronRight size={12} /></Link>}
      />

      <Section
        title={formatJstDate(dateFromKey(selectedKey), { month: 'long', day: 'numeric', weekday: 'short' })}
        action={dayBookings.length ? `${dayBookings.length}件` : undefined}
        label="選んだ日の予定"
      >
        {dayBookings.length ? (
          <Timeline>
            {dayBookings.map((booking, index) => {
              const start = formatJstTime(booking.scheduled_at)
              const end = addMinutes(start, sessionMinutes)
              const following = dayBookings[index + 1]
              const gap = following ? gapLabel(end, formatJstTime(following.scheduled_at)) : freeAfterLabel(end, closeTime)
              const isPending = booking.status === 'pending'
              const isDone = booking.status === 'completed'
              return (
                <div key={booking.id}>
                  <Slot
                    time={start}
                    end={end}
                    name={`${booking.trainee_name}さん`}
                    meta={isPending ? (booking.first_time ? '承認待ち ・ はじめて' : '承認待ち') : isDone ? `${menu} ・ 完了` : typeof booking.remaining === 'number' ? `${menu} ・ 残り${booking.remaining}回` : menu}
                    tone={isPending ? 'action' : isDone ? 'done' : 'normal'}
                    right={isPending ? <ApproveButton bookingId={booking.id} preview={preview} /> : yen(booking.price)}
                    onClick={() => setOpenId(booking.id)}
                  />
                  {gap ? <Gap>{gap}</Gap> : null}
                </div>
              )
            })}
          </Timeline>
        ) : (
          <>
            <Empty>この日の予定はありません</Empty>
            <Buttons><Button variant="secondary" onClick={() => setNewOpen(true)}>この日に予約を入れる</Button></Buttons>
          </>
        )}
      </Section>

      {preview ? <Note>確認モード（予約の作成・変更は保存されません）</Note> : null}

      <Sheet open={Boolean(opened)} onClose={() => setOpenId(null)} title="予約の詳細">
        {opened ? <BookingSheet key={`${opened.id}-${opened.status}-${opened.scheduled_at}`} booking={opened} preview={preview} onDone={done} /> : null}
      </Sheet>

      <Sheet open={newOpen} onClose={() => setNewOpen(false)} title="予約を入れる">
        {newOpen ? <NewBookingSheet dateKey={selectedKey < todayKey ? todayKey : selectedKey} clients={clients} menus={menus} preview={preview} onDone={done} /> : null}
      </Sheet>
    </Screen>
  )
}
