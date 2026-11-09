'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  addMenuAction,
  deleteMenuAction,
  saveOperationSettingsAction,
  updateMenuAction,
  type MenuInput,
} from './actions'
import type { TrainerOperationSettings, TrainerPlanBillingType } from '@/lib/trainer-settings'
import { Section, Row, Banner } from '@/ui/List'
import { Button, Buttons } from '@/ui/Button'
import { Plus } from '@/ui/icons'
import { Sheet } from '@/ui/Sheet'
import s from '@/ui/ui.module.css'

const TIME_OPTIONS = Array.from({ length: 24 * 6 + 1 }, (_, i) => {
  const totalMinutes = i * 10
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
})
const SESSION_OPTIONS = [30, 45, 60, 75, 90, 120]
const COUNT_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1)

interface MenuItem {
  id: string
  name: string
  price: number
  sessions: number
  billing_type: TrainerPlanBillingType
  description: string
  is_public: boolean
  sort_order: number
}

interface MenuDraft {
  name: string
  price: string
  sessions: string
  billing_type: TrainerPlanBillingType
  description: string
  is_public: boolean
}

function toDraft(menu?: Partial<MenuItem>): MenuDraft {
  return {
    name: menu?.name ?? '',
    price: String(menu?.price ?? 8000),
    sessions: String(menu?.sessions ?? 1),
    billing_type: menu?.billing_type ?? 'ticket',
    description: menu?.description ?? '',
    is_public: menu?.is_public ?? true,
  }
}

function toInput(draft: MenuDraft): MenuInput {
  return {
    name: draft.name,
    price: Number(draft.price),
    sessions: Number(draft.sessions),
    billing_type: draft.billing_type,
    description: draft.description,
    is_public: draft.is_public,
  }
}

const PREVIEW_ERROR = '確認モードのため保存されません'

function menuDetail(menu: Pick<MenuItem, 'billing_type' | 'sessions' | 'is_public' | 'price'>) {
  const per = menu.sessions > 0 ? Math.round(menu.price / menu.sessions) : menu.price
  const kind = menu.billing_type === 'monthly'
    ? `毎月自動で${menu.sessions}回分`
    : `回数券 ・ 1回あたり¥${per.toLocaleString()}`
  return menu.is_public ? kind : `${kind} ・ 非公開`
}

// 設定画面の中身。予約の受付時間と、お客様が買える料金メニュー
export function TrainerSettingsForm({ initialSettings, initialMenus, preview = false }: {
  initialSettings: TrainerOperationSettings
  initialMenus: MenuItem[]
  /** 確認モード。サンプルを表示するだけで、保存はしない */
  preview?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(initialSettings.business_open)
  const [close, setClose] = useState(initialSettings.business_close)
  const [sessionMinutes, setSessionMinutes] = useState(initialSettings.session_duration_minutes)
  const [menus, setMenus] = useState(() => [...initialMenus].sort((a, b) => a.sort_order - b.sort_order))
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [hoursOpen, setHoursOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  async function saveHours() {
    setError(''); setNotice(''); setSaving(true)
    const result = preview
      ? { error: PREVIEW_ERROR }
      : await saveOperationSettingsAction({ business_open: open, business_close: close, session_duration_minutes: sessionMinutes })
    setSaving(false)
    if (result.error) { setError(result.error); setHoursOpen(false); return }
    setHoursOpen(false)
    setNotice('受付時間を保存しました')
  }

  const editingMenu = editing && editing !== 'new' ? menus.find((menu) => menu.id === editing) : undefined

  return (
    <>
      {notice ? <Banner>{notice}</Banner> : null}
      {error ? <Banner tone="error">{error}</Banner> : null}

      <Section group header="予約の受付">
        <Row onClick={() => setHoursOpen(true)} title="受付時間" value={`${open}〜${close}`} />
        <Row onClick={() => setHoursOpen(true)} title="1回の時間" value={`${sessionMinutes}分`} />
      </Section>

      <Sheet open={hoursOpen} onClose={() => setHoursOpen(false)} title="予約の受付">
        <Section group footer="お客様の予約画面に出る空き時間の範囲です。">
          <div className={s.field}>
            <label htmlFor="setting-open">受付開始</label>
            <select id="setting-open" value={open} onChange={(event) => setOpen(event.target.value)}>
              {TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}
            </select>
          </div>
          <div className={s.field}>
            <label htmlFor="setting-close">受付終了</label>
            <select id="setting-close" value={close} onChange={(event) => setClose(event.target.value)}>
              {TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}
            </select>
          </div>
          <div className={s.field}>
            <label htmlFor="setting-session">1回の時間</label>
            <select id="setting-session" value={sessionMinutes} onChange={(event) => setSessionMinutes(Number(event.target.value))}>
              {SESSION_OPTIONS.map((minutes) => <option key={minutes} value={minutes}>{minutes}分</option>)}
            </select>
          </div>
        </Section>
        <Buttons><Button disabled={saving} onClick={saveHours}>{saving ? '保存しています…' : '保存する'}</Button></Buttons>
      </Sheet>

      <Section group header="料金メニュー">
        {menus.map((menu) => (
          <Row
            key={menu.id}
            strong
            onClick={() => setEditing(menu.id)}
            title={menu.name}
            subtitle={menuDetail(menu)}
            value={`¥${menu.price.toLocaleString()}`}
            strongValue
          />
        ))}
        <Row onClick={() => setEditing('new')} title="メニューを追加" strong chevron={false} trailing={<Plus />} />
      </Section>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'メニューを追加' : 'メニューを編集'}>
        {editing !== null ? (
          <MenuEditor
            key={editing}
            menu={editingMenu}
            preview={preview}
            onSaved={(message, updated) => {
              if (updated && editingMenu) setMenus((prev) => prev.map((item) => item.id === editingMenu.id ? { ...item, ...updated } : item))
              if (!editingMenu) router.refresh()
              setEditing(null)
              setNotice(message)
            }}
            onDeleted={(id) => {
              setMenus((prev) => prev.filter((item) => item.id !== id))
              setEditing(null)
              setNotice('メニューを削除しました')
            }}
          />
        ) : null}
      </Sheet>
    </>
  )
}

// メニュー1件の編集（追加も同じ形）
function MenuEditor({ menu, preview, onSaved, onDeleted }: {
  menu?: MenuItem
  preview: boolean
  onSaved: (message: string, updated?: Partial<MenuItem>) => void
  onDeleted: (id: string) => void
}) {
  const [draft, setDraft] = useState<MenuDraft>(toDraft(menu ?? { name: '', price: 8000, sessions: 4, billing_type: 'ticket', description: '' }))
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const set = (patch: Partial<MenuDraft>) => setDraft((prev) => ({ ...prev, ...patch }))

  async function save() {
    setError(''); setSaving(true)
    const result = preview
      ? { error: PREVIEW_ERROR }
      : menu ? await updateMenuAction(menu.id, toInput(draft)) : await addMenuAction(toInput(draft))
    setSaving(false)
    if (result.error) { setError(result.error); return }
    onSaved(menu ? 'メニューを更新しました' : 'メニューを追加しました', menu ? {
      name: draft.name, price: Number(draft.price), sessions: Number(draft.sessions),
      billing_type: draft.billing_type, description: draft.description, is_public: draft.is_public,
    } : undefined)
  }

  async function remove() {
    if (!menu) return
    setError(''); setSaving(true)
    const result = preview ? { error: PREVIEW_ERROR } : await deleteMenuAction(menu.id)
    setSaving(false)
    if (result.error) { setError(result.error); return }
    onDeleted(menu.id)
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); void save() }} aria-busy={saving}>
      <Section group header="メニュー">
        <div className={s.field}>
          <label htmlFor="menu-name">名前</label>
          <input id="menu-name" value={draft.name} onChange={(event) => set({ name: event.target.value })} placeholder="4回チケット" required />
        </div>
        <div className={s.field}>
          <label htmlFor="menu-kind">種類</label>
          <select id="menu-kind" value={draft.billing_type} onChange={(event) => set({ billing_type: event.target.value as TrainerPlanBillingType })}>
            <option value="ticket">回数券</option>
            <option value="monthly">月謝</option>
          </select>
        </div>
        <div className={s.field}>
          <label htmlFor="menu-count">{draft.billing_type === 'monthly' ? '毎月の回数' : '回数'}</label>
          <select id="menu-count" value={draft.sessions} onChange={(event) => set({ sessions: event.target.value })}>
            {COUNT_OPTIONS.map((count) => <option key={count} value={count}>{count}回</option>)}
          </select>
        </div>
        <div className={s.field}>
          <label htmlFor="menu-price">料金（円）</label>
          <input id="menu-price" type="number" inputMode="numeric" min={0} value={draft.price} onChange={(event) => set({ price: event.target.value })} required />
        </div>
        <div className={s.field}>
          <label htmlFor="menu-public" style={{ flex: 1, width: 'auto' }}>お客様に公開</label>
          <input id="menu-public" type="checkbox" role="switch" className={s.switch} checked={draft.is_public} onChange={(event) => set({ is_public: event.target.checked })} />
        </div>
      </Section>

      <Section header="説明">
        <textarea className={s.textarea} rows={3} value={draft.description} onChange={(event) => set({ description: event.target.value })} placeholder="マンツーマンの通常セッションです。" />
      </Section>

      {error ? <p role="alert" style={{ color: 'var(--ui-red)', fontSize: 15, margin: '16px 4px 0' }}>{error}</p> : null}

      <Section>
        <div className={s.buttons} style={{ marginTop: 0 }}>
          <Button type="submit" disabled={saving || !draft.name.trim()}>{saving ? '保存しています…' : menu ? '保存する' : '追加する'}</Button>
          {menu ? (
            confirmDelete
              ? <Button variant="destructive" disabled={saving} onClick={remove}>本当に削除する</Button>
              : <Button variant="destructive" disabled={saving} onClick={() => setConfirmDelete(true)}>このメニューを削除</Button>
          ) : null}
        </div>
      </Section>
    </form>
  )
}
