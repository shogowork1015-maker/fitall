'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addDaysToDateKey, dayOfWeekForDateKey, formatJstDate, formatJstDateKey } from '@/lib/datetime'
import { Section, Banner, Empty } from '@/ui/List'
import { Note } from '@/ui/Screen'
import { Button, Buttons } from '@/ui/Button'
import { Sheet } from '@/ui/Sheet'
import s from '@/ui/ui.module.css'
import { applyWeeklyPresetAction, saveAvailabilityAction, type AvailabilitySlot } from './actions'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
// 月曜始まりで並べる
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

type Editing = { kind: 'weekday'; day: number } | { kind: 'date'; dateKey: string } | { kind: 'pick' } | null

function hhmm(value: string) {
  return value.slice(0, 5)
}

function trimHour(value: string) {
  return hhmm(value).replace(/^0/, '')
}

function minutesOf(value: string) {
  const [h, m] = hhmm(value).split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

// 6時〜24時の帯の中での位置
function barStyle(slot: { start_time: string; end_time: string }) {
  const from = 6 * 60
  const span = 18 * 60
  const left = Math.max(0, (minutesOf(slot.start_time) - from) / span) * 100
  const width = Math.max(2, (minutesOf(slot.end_time) - minutesOf(slot.start_time)) / span * 100)
  return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }
}

function rangeLabel(slot?: { start_time: string; end_time: string }) {
  return slot ? `${hhmm(slot.start_time)}〜${hhmm(slot.end_time)}` : '休み'
}

// 空き時間の設定。
// 来る理由：予約を受け付ける時間を決める。主役：曜日ごとの受付時間。補足：これから2週間の日ごとの調整
export function AvailabilityEditor({ initialSlots, businessOpen, businessClose, preview = false }: {
  initialSlots: AvailabilitySlot[]
  businessOpen: string
  businessClose: string
  preview?: boolean
}) {
  const router = useRouter()
  const todayKey = formatJstDateKey()
  const [slots, setSlots] = useState(initialSlots)
  const [editing, setEditing] = useState<Editing>(null)
  const [notice, setNotice] = useState('')

  const byDate = useMemo(() => new Map(slots.map((slot) => [slot.slot_date, slot])), [slots])

  // 曜日ごとに、これから先でいちばん近い日の受付時間を代表として出す
  const weekly = useMemo(() => {
    const result = new Map<number, AvailabilitySlot>()
    for (const slot of [...slots].sort((a, b) => a.slot_date.localeCompare(b.slot_date))) {
      if (slot.slot_date < todayKey) continue
      const day = dayOfWeekForDateKey(slot.slot_date)
      if (!result.has(day)) result.set(day, slot)
    }
    return result
  }, [slots, todayKey])

  // これから60日のうち、毎週の時間と違う日（休み・時間変更）
  const exceptions = Array.from({ length: 60 }, (_, index) => addDaysToDateKey(todayKey, index)).filter((key) => {
    const base = weekly.get(dayOfWeekForDateKey(key))
    const slot = byDate.get(key)
    if (!base && !slot) return false
    if (!base || !slot) return Boolean(base) !== Boolean(slot)
    return hhmm(base.start_time) !== hhmm(slot.start_time) || hhmm(base.end_time) !== hhmm(slot.end_time)
  })

  function saved(message: string, next?: AvailabilitySlot[]) {
    if (next) setSlots(next)
    setEditing(null)
    setNotice(message)
    router.refresh()
  }

  return (
    <>
      {notice ? <Banner>{notice}</Banner> : null}

      <section aria-label="毎週の受付">
        <div className={s.hoursAxis} aria-hidden="true"><span /><div><span>6</span><span>12</span><span>18</span><span>24</span></div><span /></div>
        <div className={s.hours}>
          {WEEK_ORDER.map((day) => {
            const slot = weekly.get(day)
            const bar = slot ? barStyle(slot) : null
            return (
              <button key={day} type="button" className={s.hoursRow} data-off={!slot} onClick={() => setEditing({ kind: 'weekday', day })} aria-label={`毎週${WEEKDAYS[day]}曜日 ${rangeLabel(slot)}`}>
                <b>{WEEKDAYS[day]}</b>
                <span className={s.track} aria-hidden="true">{bar ? <i style={bar} /> : null}</span>
                <span>{slot ? `${trimHour(slot.start_time)}–${trimHour(slot.end_time)}` : '休み'}</span>
              </button>
            )
          })}
        </div>
      </section>
      <p className={s.sectionFooter} style={{ marginLeft: 22, marginRight: 22 }}>曜日を押すと時間を変えられます。半年先まで同じ時間で予約を受け付けます。</p>

      <Section title="いつもと違う日" action={<button type="button" onClick={() => setEditing({ kind: 'pick' })}>追加</button>}>
        {exceptions.length ? (
          <div className={s.dates}>
            {exceptions.map((key) => (
              <button key={key} type="button" className={s.dateRow} style={{ gridTemplateColumns: '1fr auto' }} onClick={() => setEditing({ kind: 'date', dateKey: key })}>
                <span className={s.dateMain}><b>{formatJstDate(`${key}T00:00:00+09:00`, { month: 'long', day: 'numeric', weekday: 'short' })}</b></span>
                <span className={s.dateRight} data-strong={Boolean(byDate.get(key))}>{rangeLabel(byDate.get(key))}</span>
              </button>
            ))}
          </div>
        ) : <Empty>いつも通りです。特定の日だけ休みにするときは「追加」から。</Empty>}
      </Section>

      {preview ? <Note>確認モード（保存されません）</Note> : null}

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.kind === 'weekday' ? `毎週${WEEKDAYS[editing.day]}曜日` : editing?.kind === 'date' ? formatJstDate(`${editing.dateKey}T00:00:00+09:00`, { month: 'long', day: 'numeric', weekday: 'short' }) : '日付を選ぶ'}
      >
        {editing?.kind === 'pick' ? (
          <DatePicker min={todayKey} onPick={(dateKey) => setEditing({ kind: 'date', dateKey })} />
        ) : editing ? (
          <HoursEditor
            key={editing.kind === 'weekday' ? `w${editing.day}` : editing.dateKey}
            current={editing.kind === 'weekday' ? weekly.get(editing.day) : byDate.get(editing.dateKey)}
            defaultOpen={businessOpen}
            defaultClose={businessClose}
            preview={preview}
            onSave={async (open, start, end) => {
              if (editing.kind === 'weekday') {
                const result = await applyWeeklyPresetAction(editing.day, `${start}:00`, `${end}:00`, open ? 'open' : 'block')
                if (result.error) return result.error
                saved(`毎週${WEEKDAYS[editing.day]}曜日を${open ? `${start}〜${end}にしました` : '休みにしました'}`)
                return null
              }
              const others = slots.filter((slot) => slot.slot_date !== editing.dateKey)
              const next = open ? [...others, { slot_date: editing.dateKey, start_time: `${start}:00`, end_time: `${end}:00` }] : others
              const result = await saveAvailabilityAction(next)
              if (result.error) return result.error
              saved(open ? '受付時間を変更しました' : 'この日を休みにしました', next)
              return null
            }}
          />
        ) : null}
      </Sheet>
    </>
  )
}

// 受付する・しない、開始と終了を選ぶシートの中身
function HoursEditor({ current, defaultOpen, defaultClose, preview, onSave }: {
  current?: AvailabilitySlot
  defaultOpen: string
  defaultClose: string
  preview: boolean
  onSave: (open: boolean, start: string, end: string) => Promise<string | null>
}) {
  const [open, setOpen] = useState(Boolean(current))
  const [start, setStart] = useState(current ? hhmm(current.start_time) : hhmm(defaultOpen))
  const [end, setEnd] = useState(current ? hhmm(current.end_time) : hhmm(defaultClose))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const invalid = open && start >= end

  async function submit() {
    if (preview) { setError('確認モードのため保存されません。'); return }
    setSaving(true); setError('')
    try {
      const message = await onSave(open, start, end)
      if (message) setError(message)
    } catch {
      setError('保存できたか確認できませんでした。もう一度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); void submit() }} aria-busy={saving}>
      <Section group footer={invalid ? '終了は開始より後にしてください。' : undefined}>
        <div className={s.field}>
          <label htmlFor="hours-open" style={{ flex: 1, width: 'auto' }}>予約を受け付ける</label>
          <input id="hours-open" type="checkbox" role="switch" className={s.switch} checked={open} onChange={(event) => setOpen(event.target.checked)} />
        </div>
        {open ? (
          <>
            <div className={s.field}>
              <label htmlFor="hours-start">開始</label>
              <input id="hours-start" type="time" step={600} value={start} onChange={(event) => setStart(event.target.value)} />
            </div>
            <div className={s.field}>
              <label htmlFor="hours-end">終了</label>
              <input id="hours-end" type="time" step={600} value={end} onChange={(event) => setEnd(event.target.value)} />
            </div>
          </>
        ) : null}
      </Section>
      {error ? <p role="alert" style={{ color: 'var(--ui-red)', fontSize: 15, margin: '16px 4px 0' }}>{error}</p> : null}
      <Section>
        <Button type="submit" disabled={saving || invalid}>{saving ? '保存しています…' : '保存する'}</Button>
      </Section>
    </form>
  )
}

// 「いつもと違う日」を追加するときに、まず日付を選ぶ
function DatePicker({ min, onPick }: { min: string; onPick: (dateKey: string) => void }) {
  const [date, setDate] = useState(min)
  return (
    <>
      <Section group>
        <div className={s.field}>
          <label htmlFor="pick-date">日付</label>
          <input id="pick-date" type="date" value={date} min={min} onChange={(event) => setDate(event.target.value)} />
        </div>
      </Section>
      <Buttons><Button disabled={!date} onClick={() => onPick(date)}>この日の時間を決める</Button></Buttons>
    </>
  )
}
