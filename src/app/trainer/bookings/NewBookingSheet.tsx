'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTrainerReservationAction } from '@/app/trainer/availability/actions'
import { addDaysToDateKey } from '@/lib/datetime'
import { Section, Row } from '@/ui/List'
import { Button } from '@/ui/Button'
import s from '@/ui/ui.module.css'
import b from './bookings.module.css'

export interface ClientOption {
  trainee_id: string
  name: string
}

export interface MenuOption {
  id: string
  name: string
  price: number
}

// 予約を入れるシートの中身。設定アプリと同じ入力行で、お客様・メニュー・日時を選ぶ
export function NewBookingSheet({ dateKey, clients, menus, preview, onDone }: {
  dateKey: string
  clients: ClientOption[]
  menus: MenuOption[]
  preview: boolean
  onDone: (message: string) => void
}) {
  const router = useRouter()
  const [clientId, setClientId] = useState(clients[0]?.trainee_id ?? '')
  const [menuId, setMenuId] = useState(menus[0]?.id ?? '')
  const [date, setDate] = useState(dateKey)
  const [time, setTime] = useState('10:00')
  const [repeat, setRepeat] = useState(false)
  const [until, setUntil] = useState(addDaysToDateKey(dateKey, 28))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)

  if (!clients.length) {
    return (
      <>
        <Section group footer="お客様が登録リンクから登録すると、ここで選べるようになります。">
          <Row title="まだお客様がいません" />
        </Section>
        <Section>
          <Button href="/trainer/invite">登録リンクを送る</Button>
        </Section>
      </>
    )
  }

  async function submit() {
    if (submitting.current) return
    setError('')
    if (preview) { onDone('確認モードのため、予約は保存されません'); return }
    submitting.current = true
    setSaving(true)
    try {
      const result = await createTrainerReservationAction({
        trainee_id: clientId,
        plan_id: menuId || null,
        date,
        start_time: time,
        repeat_enabled: repeat,
        repeat_start_date: repeat ? date : undefined,
        repeat_until_date: repeat ? until : undefined,
      })
      if (result.error) { setError(result.error); return }
      router.refresh()
      onDone(repeat ? '毎週の予約を入れました' : '予約を入れました')
    } catch {
      setError('保存できたか確認できませんでした。一覧を確認してから、もう一度お試しください。')
    } finally {
      submitting.current = false
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); void submit() }} aria-busy={saving}>
      <Section group header="内容">
        <div className={s.field}>
          <label htmlFor="new-client">お客様</label>
          <select id="new-client" value={clientId} onChange={(event) => setClientId(event.target.value)} required>
            {clients.map((client) => <option key={client.trainee_id} value={client.trainee_id}>{client.name}</option>)}
          </select>
        </div>
        <div className={s.field}>
          <label htmlFor="new-menu">メニュー</label>
          <select id="new-menu" value={menuId} onChange={(event) => setMenuId(event.target.value)}>
            {!menus.length ? <option value="">メニューなし</option> : null}
            {menus.map((menu) => <option key={menu.id} value={menu.id}>{menu.name}（¥{menu.price.toLocaleString()}）</option>)}
          </select>
        </div>
      </Section>

      <Section group header="日時" footer="開始時間は5分ごとに選べます。">
        <div className={s.field}>
          <label htmlFor="new-date">日付</label>
          <input id="new-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </div>
        <div className={s.field}>
          <label htmlFor="new-time">開始</label>
          <input id="new-time" type="time" step={300} value={time} onChange={(event) => setTime(event.target.value)} required />
        </div>
      </Section>

      <Section group footer={repeat ? '同じ曜日・同じ時間で、終了日までまとめて入れます。' : undefined}>
        <div className={s.field}>
          <label htmlFor="new-repeat" style={{ flex: 1, width: 'auto' }}>毎週くり返す</label>
          <input id="new-repeat" type="checkbox" role="switch" className={s.switch} checked={repeat} onChange={(event) => setRepeat(event.target.checked)} />
        </div>
        {repeat ? (
          <div className={s.field}>
            <label htmlFor="new-until">終了日</label>
            <input id="new-until" type="date" value={until} min={date} onChange={(event) => setUntil(event.target.value)} />
          </div>
        ) : null}
      </Section>

      {error ? <p role="alert" className={b.message} data-tone="error">{error}</p> : null}

      <Section footer={preview ? '確認モードのため、予約は保存されません。' : undefined}>
        <Button type="submit" disabled={saving || !clientId}>{saving ? '保存しています…' : '予約を入れる'}</Button>
      </Section>
    </form>
  )
}
