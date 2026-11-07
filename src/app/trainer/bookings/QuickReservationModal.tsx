'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Toast } from '@/components/Toast'
import { createTrainerReservationAction } from '@/app/trainer/availability/actions'

interface ClientOption {
  trainee_id: string
  name: string
}

interface MenuOption {
  id: string
  name: string
  price: number
}

interface Props {
  open: boolean
  dateKey: string
  startTime: string
  clients: ClientOption[]
  menus: MenuOption[]
  preview?: boolean
  onClose: () => void
}

function addMonths(dateKey: string, months: number) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year ?? 0, (month ?? 1) - 1 + months, day ?? 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function formatDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

export function QuickReservationModal({
  open,
  dateKey,
  startTime,
  clients,
  menus,
  preview = false,
  onClose,
}: Props) {
  const [clientId, setClientId] = useState(clients[0]?.trainee_id ?? '')
  const [menuId, setMenuId] = useState(menus[0]?.id ?? '')
  const [time, setTime] = useState(startTime)
  const [repeatEnabled, setRepeatEnabled] = useState(false)
  const [repeatUntil, setRepeatUntil] = useState(addMonths(dateKey, 1))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [closing, setClosing] = useState(false)

  const dialogRef = useRef<HTMLDialogElement>(null)
  const submittingRef = useRef(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!open || !dialog) return
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.showModal()
    dialog.querySelector<HTMLSelectElement>('#reservation-client')?.focus()
    return () => {
      dialog.close()
      trigger?.focus()
    }
  }, [open])

  if (!open) return null

  // シートを閉じる動きが終わってから親へ通知する
  function requestClose() {
    if (saving || closing) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      onClose()
      return
    }
    setClosing(true)
    setTimeout(onClose, 260)
  }

  async function submit() {
    if (submittingRef.current) return
    if (!clientId) {
      setError('お客様を選択してください')
      return
    }

    setError(null)
    setSaving(true)
    if (preview) {
      setSaving(false)
      setToast(repeatEnabled ? '固定予約のプレビューです' : '予約作成のプレビューです')
      return
    }

    submittingRef.current = true
    let saved = false
    try {
      const result = await createTrainerReservationAction({
        trainee_id: clientId,
        plan_id: menuId || null,
        date: dateKey,
        start_time: time,
        repeat_enabled: repeatEnabled,
        repeat_start_date: repeatEnabled ? dateKey : undefined,
        repeat_until_date: repeatEnabled ? repeatUntil : undefined,
      })
      if (result.error) {
        setError(result.error)
        return
      }

      saved = true
      setToast(repeatEnabled ? '固定予約を作成しました' : '予約を作成しました')
      setTimeout(() => window.location.reload(), 600)
    } catch {
      setError('保存結果を確認できませんでした。予約一覧を確認してから、もう一度お試しください。')
    } finally {
      if (!saved) {
        submittingRef.current = false
        setSaving(false)
      }
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="reservation-title"
      data-closing={closing}
      onCancel={(event) => { event.preventDefault(); requestClose() }}
      onClick={(event) => { if (event.target === dialogRef.current) requestClose() }}
      className="fitall-sheet"
    >
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      <form onSubmit={(event) => { event.preventDefault(); void submit() }} aria-busy={saving}>
        <fieldset disabled={saving} className="min-w-0 border-0 p-0">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="fitall-kicker">
                {preview ? '予約作成プレビュー' : '予約作成'}
              </p>
              <h2 id="reservation-title" className="mt-1 text-xl font-black text-ink">
                {formatDate(dateKey)} {time}
              </h2>
            </div>
            <button
              type="button"
              onClick={requestClose}
              className="fitall-icon-button"
              aria-label="閉じる"
            >
              ×
            </button>
          </div>

          {error && (
            <div role="alert" className="mb-3 rounded-control border border-danger-line bg-danger-soft px-3 py-2 text-base font-semibold text-danger">
              {error}
            </div>
          )}

          {preview && (
            <div className="mb-3 rounded-control border border-accent bg-accent-soft px-3 py-2 text-base font-bold text-brand">
              プレビューのため、予約は保存されません。
            </div>
          )}

          {!clients.length ? (
            <div className="rounded-control border-2 border-dashed border-line bg-white p-5 text-center">
              <p className="text-base font-bold text-ink">先にお客様を登録してください</p>
              <Link
                href="/trainer/invite"
                className="fitall-primary-action mt-3"
              >
                登録リンクを共有する
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <label htmlFor="reservation-client" className="block text-base font-bold">お客様</label>
              <select
                id="reservation-client"
                autoFocus
                required
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                className="h-14 w-full rounded-control border border-line bg-white px-3 text-base font-bold text-ink outline-none focus:border-accent"
              >
                {clients.map((client) => (
                  <option key={client.trainee_id} value={client.trainee_id}>
                    {client.name}
                  </option>
                ))}
              </select>

              <label htmlFor="reservation-menu" className="block text-base font-bold">メニュー</label>
              <select
                id="reservation-menu"
                value={menuId}
                onChange={(event) => setMenuId(event.target.value)}
                className="h-14 w-full rounded-control border border-line bg-white px-3 text-base font-bold text-ink outline-none focus:border-accent"
              >
                {!menus.length && <option value="">メニューなし</option>}
                {menus.map((menu) => (
                  <option key={menu.id} value={menu.id}>
                    {menu.name} / ¥{menu.price.toLocaleString()}
                  </option>
                ))}
              </select>

              <div>
                <label htmlFor="reservation-time" className="mb-1 block text-base font-medium text-ink-muted">
                  開始時間（5分刻みで変更可）
                </label>
                <input
                  id="reservation-time"
                  required
                  type="time"
                  step={300}
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="h-14 w-full rounded-control border border-line bg-white px-3 text-base font-bold text-ink outline-none focus:border-accent"
                />
              </div>

              <label className="flex min-h-14 items-center justify-between gap-3 rounded-control border border-line px-4 py-3 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                <span>
                  <span className="block text-base font-bold text-ink">毎週固定で予約</span>
                  <span className="text-base font-medium text-ink-muted">同じ曜日・同じ時間でまとめて作成</span>
                </span>
                <input
                  type="checkbox"
                  checked={repeatEnabled}
                  onChange={(event) => setRepeatEnabled(event.target.checked)}
                  className="h-6 w-6 shrink-0 accent-accent"
                />
              </label>

              {repeatEnabled && (
                <div>
                  <label htmlFor="reservation-until" className="mb-1 block text-base font-medium text-ink-muted">固定予約の終了日</label>
                  <input
                    id="reservation-until"
                    required
                    min={dateKey}
                    type="date"
                    value={repeatUntil}
                    onChange={(event) => setRepeatUntil(event.target.value)}
                  className="h-14 w-full rounded-control border border-line bg-white px-3 text-base font-bold text-ink"
                  />
                </div>
              )}
            </div>
          )}

        </fieldset>
        <div className="sticky bottom-0 mt-5 grid grid-cols-[auto_1fr] gap-2 border-t border-line bg-white pt-3">
          <button
            type="button"
            onClick={requestClose}
            disabled={saving}
            className="h-12 rounded-control border border-line px-5 text-base font-medium text-ink-muted"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={saving || !clients.length}
            className="fitall-aqua-action gap-2 disabled:opacity-40"
          >
            {saving && <span aria-hidden="true" className="fitall-spinner" />}
            {saving ? '保存中…' : preview ? '入力を確認する' : '予約する'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
