'use client'

import { useState } from 'react'
import { Toast } from '@/components/Toast'
import {
  addMenuAction,
  deleteMenuAction,
  saveOperationSettingsAction,
  updateMenuAction,
  type MenuInput,
} from './actions'
import type { TrainerOperationSettings, TrainerPlanBillingType } from '@/lib/trainer-settings'

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

interface Props {
  initialSettings: TrainerOperationSettings
  initialMenus: MenuItem[]
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

function formatPrice(value: number) {
  return `¥${value.toLocaleString()}`
}

function menuKindLabel(menu: Pick<MenuItem, 'billing_type' | 'sessions'>) {
  return menu.billing_type === 'monthly' ? `月謝 / 月${menu.sessions}回` : `回数券 / ${menu.sessions}回`
}

export function TrainerSettingsForm({ initialSettings, initialMenus }: Props) {
  const sortedMenus = [...initialMenus].sort((a, b) => a.sort_order - b.sort_order)
  const [open, setOpen] = useState(initialSettings.business_open)
  const [close, setClose] = useState(initialSettings.business_close)
  const [sessionMinutes, setSessionMinutes] = useState(initialSettings.session_duration_minutes)
  const [menus, setMenus] = useState(sortedMenus)
  const [newDraft, setNewDraft] = useState<MenuDraft>(
    toDraft({
      name: 'パーソナル60分',
      price: 7700,
      sessions: 1,
      billing_type: 'ticket',
      description: 'マンツーマンの通常セッションです。',
    })
  )
  const [drafts, setDrafts] = useState<Record<string, MenuDraft>>(
    Object.fromEntries(sortedMenus.map((menu) => [menu.id, toDraft(menu)]))
  )
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function updateDraft(planId: string, patch: Partial<MenuDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [planId]: { ...(prev[planId] ?? toDraft()), ...patch },
    }))
  }

  async function onSaveSettings() {
    setError(null)
    setSavingKey('operation')
    const result = await saveOperationSettingsAction({
      business_open: open,
      business_close: close,
      session_duration_minutes: sessionMinutes,
    })
    setSavingKey(null)
    if (result.error) {
      setError(result.error)
      return
    }
    setToast('受付設定を保存しました')
  }

  async function onAddMenu() {
    setError(null)
    setSavingKey('new')
    const result = await addMenuAction(toInput(newDraft))
    setSavingKey(null)
    if (result.error) {
      setError(result.error)
      return
    }
    setToast('メニューを追加しました')
    window.location.reload()
  }

  async function onUpdateMenu(menu: MenuItem) {
    const draft = drafts[menu.id] ?? toDraft(menu)
    setError(null)
    setSavingKey(menu.id)
    const result = await updateMenuAction(menu.id, toInput(draft))
    setSavingKey(null)
    if (result.error) {
      setError(result.error)
      return
    }
    setMenus((prev) =>
      prev.map((item) =>
        item.id === menu.id
          ? {
              ...item,
              name: draft.name,
              price: Number(draft.price),
              sessions: Number(draft.sessions),
              billing_type: draft.billing_type,
              description: draft.description,
              is_public: draft.is_public,
            }
          : item
      )
    )
    setToast('メニューを更新しました')
  }

  async function onDeleteMenu(planId: string) {
    setError(null)
    setSavingKey(planId)
    const result = await deleteMenuAction(planId)
    setSavingKey(null)
    if (result.error) {
      setError(result.error)
      return
    }
    setMenus((prev) => prev.filter((m) => m.id !== planId))
    setToast('メニューを削除しました')
  }

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      {error && (
        <div role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-base font-semibold text-danger">
          {error}
        </div>
      )}

      <section className="fitall-card">
        <div className="space-y-3 p-5">
          <h2 className="text-lg font-bold text-ink">予約の基本設定</h2>
          <p className="text-subhead leading-relaxed text-ink-muted">
            ここで設定した営業時間とセッション時間を使って、お客様用の予約枠を自動で出します。
          </p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <select
              value={open}
              onChange={(e) => setOpen(e.target.value)}
              className="fitall-input"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={`open-${t}`} value={t}>
                  営業開始 {t}
                </option>
              ))}
            </select>
            <select
              value={close}
              onChange={(e) => setClose(e.target.value)}
              className="fitall-input"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={`close-${t}`} value={t}>
                  営業終了 {t}
                </option>
              ))}
            </select>
            <select
              value={sessionMinutes}
              onChange={(e) => setSessionMinutes(Number(e.target.value))}
              className="fitall-input"
            >
              {SESSION_OPTIONS.map((v) => (
                <option key={`session-${v}`} value={v}>
                  1セッション {v}分
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void onSaveSettings()}
            disabled={savingKey === 'operation'}
            className="fitall-primary-action disabled:opacity-40"
          >
            {savingKey === 'operation' ? '保存中...' : '予約設定を保存'}
          </button>
        </div>
      </section>

      <section className="fitall-card p-5">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">販売メニュー（回数券・月謝）</h2>
            <p className="mt-1 text-subhead leading-relaxed text-ink-muted">
              作ったメニューが予約ページに出ます。決済はStripeで行います。
            </p>
          </div>
          <span className="fitall-badge" data-tone="accent">
            公開 {menus.filter((m) => m.is_public).length} / {menus.length}
          </span>
        </div>

        <p className="mt-5 text-subhead font-semibold text-ink-muted">新しいメニュー</p>
        <div className="mt-2 grid gap-2 md:grid-cols-[150px_1fr_130px_120px]">
          <select
            value={newDraft.billing_type}
            onChange={(e) =>
              setNewDraft((prev) => ({
                ...prev,
                billing_type: e.target.value as TrainerPlanBillingType,
                name: e.target.value === 'monthly' ? '月4回プラン' : 'パーソナル60分',
                sessions: e.target.value === 'monthly' ? '4' : '1',
              }))
            }
            className="fitall-input"
          >
            <option value="ticket">回数券</option>
            <option value="monthly">月謝</option>
          </select>
          <input
            value={newDraft.name}
            onChange={(e) => setNewDraft((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="メニュー名"
            className="fitall-input"
          />
          <input
            type="number"
            min={1}
            value={newDraft.price}
            onChange={(e) => setNewDraft((prev) => ({ ...prev, price: e.target.value }))}
            placeholder="金額"
            className="fitall-input"
          />
          <select
            value={newDraft.sessions}
            onChange={(e) => setNewDraft((prev) => ({ ...prev, sessions: e.target.value }))}
            className="fitall-input"
          >
            {COUNT_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count}回
              </option>
            ))}
          </select>
          <textarea
            value={newDraft.description}
            onChange={(e) => setNewDraft((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="予約ページに出す説明文"
            className="fitall-input fitall-textarea md:col-span-3"
          />
          <button
            type="button"
            onClick={() => void onAddMenu()}
            disabled={savingKey === 'new'}
            className="fitall-aqua-action disabled:opacity-40 md:col-span-1"
          >
            {savingKey === 'new' ? '追加中...' : 'メニューを作成'}
          </button>
        </div>
      </section>

      {!menus.length ? (
        <div className="fitall-card p-6 text-center text-subhead text-ink-muted">
          まだメニューがありません。回数券か月謝を作ると、お客様マイページで選べるようになります。
        </div>
      ) : (
        <div className="space-y-3">
          {menus.map((menu) => {
            const draft = drafts[menu.id] ?? toDraft(menu)
            return (
              <section key={menu.id} className="fitall-card">
                <div>
                  <div className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="fitall-badge" data-tone={draft.is_public ? 'accent' : undefined}>
                            {draft.is_public ? '公開中' : '非公開'}
                          </span>
                          <span className="fitall-badge">
                            {menuKindLabel({
                              billing_type: draft.billing_type,
                              sessions: Number(draft.sessions) || 1,
                            })}
                          </span>
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-ink">{draft.name}</h3>
                      </div>
                      <p className="fitall-figure shrink-0 text-xl">{formatPrice(Number(draft.price) || 0)}</p>
                    </div>
                    <div>
                      <label className="inline-flex min-h-11 items-center gap-3 text-base font-medium text-ink">
                        <input
                          type="checkbox"
                          checked={draft.is_public}
                          onChange={(e) => updateDraft(menu.id, { is_public: e.target.checked })}
                        />
                        予約ページに出す
                      </label>
                    </div>

                    <div className="grid gap-2 md:grid-cols-[150px_1fr_130px_110px]">
                      <select
                        value={draft.billing_type}
                        onChange={(e) =>
                          updateDraft(menu.id, {
                            billing_type: e.target.value as TrainerPlanBillingType,
                          })
                        }
                        className="fitall-input"
                      >
                        <option value="ticket">回数券</option>
                        <option value="monthly">月謝</option>
                      </select>
                      <input
                        value={draft.name}
                        onChange={(e) => updateDraft(menu.id, { name: e.target.value })}
                        className="fitall-input"
                      />
                      <input
                        type="number"
                        min={1}
                        value={draft.price}
                        onChange={(e) => updateDraft(menu.id, { price: e.target.value })}
                        className="fitall-input"
                      />
                      <select
                        value={draft.sessions}
                        onChange={(e) => updateDraft(menu.id, { sessions: e.target.value })}
                        className="fitall-input"
                      >
                        {COUNT_OPTIONS.map((count) => (
                          <option key={count} value={count}>
                            {count}回
                          </option>
                        ))}
                      </select>
                    </div>

                    <textarea
                      value={draft.description}
                      onChange={(e) => updateDraft(menu.id, { description: e.target.value })}
                      placeholder="予約ページに出す説明文"
                      className="fitall-input fitall-textarea w-full"
                    />

                    <div className="grid grid-cols-2 gap-2 md:flex md:justify-end">
                      <button
                        type="button"
                        onClick={() => void onDeleteMenu(menu.id)}
                        disabled={savingKey === menu.id}
                        className="fitall-secondary-action !text-danger disabled:opacity-40"
                      >
                        削除
                      </button>
                      <button
                        type="button"
                        onClick={() => void onUpdateMenu(menu)}
                        disabled={savingKey === menu.id}
                        className="fitall-primary-action disabled:opacity-40 md:!w-auto"
                      >
                        {savingKey === menu.id ? '保存中...' : '変更を保存'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
