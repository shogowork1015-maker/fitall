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

  async function submit() {
    if (submittingRef.current) return
    if (!clientId) {
      setError('お客さんを選択してください')
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
      onCancel={(event) => { event.preventDefault(); if (!saving) onClose() }}
      className="fitall-reservation-dialog"
    >
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      <form onSubmit={(event) => { event.preventDefault(); void submit() }} aria-busy={saving}>
        <fieldset disabled={saving} className="min-w-0 border-0 p-0">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#087D78]">
                {preview ? '予約作成プレビュー' : '予約作成'}
              </p>
              <h2 id="reservation-title" className="mt-1 text-xl font-black text-[#0A0A0A]">
                {formatDate(dateKey)} {time}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 rounded-[8px] border border-[#DDE8E8] text-xl font-bold leading-none text-[#555555]"
              aria-label="閉じる"
            >
              ×
            </button>
          </div>

          {error && (
            <div role="alert" className="mb-3 rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm font-semibold text-[#D4183D]">
              {error}
            </div>
          )}

          {preview && (
            <div className="mb-3 rounded-[8px] border border-[#12C7BE] bg-[#E8FBFA] px-3 py-2 text-xs font-bold text-[#087D78]">
              プレビューのため、予約は保存されません。
            </div>
          )}

          {!clients.length ? (
            <div className="rounded-[10px] border-2 border-dashed border-[#DDE8E8] bg-white p-5 text-center">
              <p className="text-sm font-bold text-[#0A0A0A]">先にお客さんを登録してください</p>
              <Link
                href="/trainer/invite"
                className="mt-3 inline-flex h-11 items-center rounded-[8px] bg-[#0A0A0A] px-4 text-sm font-bold text-white"
              >
                登録リンクを共有する
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <label htmlFor="reservation-client" className="block text-sm font-bold">お客さん</label>
              <select
                id="reservation-client"
                autoFocus
                required
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                className="h-14 w-full rounded-[8px] border-2 border-[#DDE8E8] bg-white px-3 text-sm font-bold text-[#0A0A0A] outline-none focus:border-[#12C7BE]"
              >
                {clients.map((client) => (
                  <option key={client.trainee_id} value={client.trainee_id}>
                    {client.name}
                  </option>
                ))}
              </select>

              <label htmlFor="reservation-menu" className="block text-sm font-bold">メニュー</label>
              <select
                id="reservation-menu"
                value={menuId}
                onChange={(event) => setMenuId(event.target.value)}
                className="h-14 w-full rounded-[8px] border-2 border-[#DDE8E8] bg-white px-3 text-sm font-bold text-[#0A0A0A] outline-none focus:border-[#12C7BE]"
              >
                {!menus.length && <option value="">メニューなし</option>}
                {menus.map((menu) => (
                  <option key={menu.id} value={menu.id}>
                    {menu.name} / ¥{menu.price.toLocaleString()}
                  </option>
                ))}
              </select>

              <div>
                <label htmlFor="reservation-time" className="mb-1 block text-xs font-black text-[#555555]">
                  開始時間（5分刻みで変更可）
                </label>
                <input
                  id="reservation-time"
                  required
                  type="time"
                  step={300}
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="h-14 w-full rounded-[8px] border-2 border-[#DDE8E8] bg-white px-3 text-sm font-bold text-[#0A0A0A] outline-none focus:border-[#12C7BE]"
                />
              </div>

              <label className="flex items-center justify-between rounded-[8px] border-2 border-[#DDE8E8] px-4 py-3 has-[:checked]:border-[#12C7BE] has-[:checked]:bg-[#E8FBFA]">
                <span>
                  <span className="block text-sm font-bold text-[#0A0A0A]">毎週固定で予約</span>
                  <span className="text-xs font-semibold text-[#6B7280]">同じ曜日・同じ時間でまとめて作成</span>
                </span>
                <input
                  type="checkbox"
                  checked={repeatEnabled}
                  onChange={(event) => setRepeatEnabled(event.target.checked)}
                  className="h-5 w-5 accent-[#12C7BE]"
                />
              </label>

              {repeatEnabled && (
                <div>
                  <label htmlFor="reservation-until" className="mb-1 block text-xs font-bold text-[#6B7280]">固定予約の終了日</label>
                  <input
                    id="reservation-until"
                    required
                    min={dateKey}
                    type="date"
                    value={repeatUntil}
                    onChange={(event) => setRepeatUntil(event.target.value)}
                  className="h-12 w-full rounded-[8px] border-2 border-[#DDE8E8] px-3 text-sm font-bold text-[#0A0A0A]"
                  />
                </div>
              )}
            </div>
          )}

        </fieldset>
        <div className="sticky bottom-0 mt-5 flex justify-end gap-2 border-t border-[#DDE8E8] bg-white pt-3 pb-1">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-12 rounded-[8px] border border-[#DDE8E8] px-5 text-sm font-bold text-[#555555]"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={saving || !clients.length}
            className="h-12 rounded-[8px] bg-[#12C7BE] px-5 text-sm font-black text-white disabled:opacity-40"
          >
            {saving ? '保存中…' : preview ? '入力を確認する' : '予約する'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
