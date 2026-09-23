'use client'

import { useMemo, useState } from 'react'
import { Toast } from '@/components/Toast'
import { createTrainerReservationAction } from './actions'

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
  onClose: () => void
  dateKey: string
  startTime: string
  endTime: string
  clients: ClientOption[]
  menus: MenuOption[]
  onOpenSave: () => Promise<void>
  onBlockSave: (repeat: boolean, repeatStart?: string, repeatUntil?: string) => Promise<void>
}

type Tab = 'reservation' | 'block'

export function SelectionPopover({
  open,
  onClose,
  dateKey,
  startTime,
  endTime,
  clients,
  menus,
  onOpenSave,
  onBlockSave,
}: Props) {
  const [tab, setTab] = useState<Tab>('reservation')
  const [clientId, setClientId] = useState<string>(clients[0]?.trainee_id ?? '')
  const [menuId, setMenuId] = useState<string>(menus[0]?.id ?? '')
  const [time, setTime] = useState<string>(startTime)
  const [repeatEnabled, setRepeatEnabled] = useState(false)
  const [repeatStart, setRepeatStart] = useState(dateKey)
  const [repeatUntil, setRepeatUntil] = useState(dateKey)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const dateLabel = useMemo(
    () =>
      new Date(`${dateKey}T00:00:00`).toLocaleDateString('ja-JP', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      }),
    [dateKey]
  )

  if (!open) return null

  async function onSaveReservation() {
    if (!clientId) {
      setError('お客さんを選択してください')
      return
    }

    setError(null)
    setSaving(true)
    const result = await createTrainerReservationAction({
      trainee_id: clientId,
      plan_id: menuId || null,
      date: dateKey,
      start_time: time,
      repeat_enabled: repeatEnabled,
      repeat_start_date: repeatEnabled ? repeatStart : undefined,
      repeat_until_date: repeatEnabled ? repeatUntil : undefined,
    })
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }

    await onOpenSave()
    setToast('予約を作成しました')
    setTimeout(() => window.location.reload(), 600)
  }

  async function onSaveBlock() {
    setError(null)
    setSaving(true)
    await onBlockSave(repeatEnabled, repeatStart, repeatUntil)
    setSaving(false)
    setToast('ブロック設定を保存しました')
    setTimeout(() => window.location.reload(), 600)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      <div className="w-full max-w-[520px] bg-white rounded-[24px] border border-[#E5E7EB] shadow-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-lg font-bold text-[#0A0A0A]">予定を作成</p>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-full border border-[#E5E7EB] text-[#6B7280] text-xl leading-none"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-[#6B7280] mb-3">
          {dateLabel} {startTime} - {endTime}
        </p>

        {error && (
          <div className="mb-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[12px] px-3 py-2 text-sm text-[#EF4444]">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => setTab('reservation')}
            className={`h-11 px-4 rounded-[12px] text-sm font-bold ${
              tab === 'reservation'
                ? 'bg-[#0A0A0A] text-white'
                : 'bg-[#F3F4F6] text-[#6B7280]'
            }`}
          >
            予約
          </button>
          <button
            type="button"
            onClick={() => setTab('block')}
            className={`h-11 px-4 rounded-[12px] text-sm font-bold ${
              tab === 'block' ? 'bg-[#0A0A0A] text-white' : 'bg-[#F3F4F6] text-[#6B7280]'
            }`}
          >
            ブロック
          </button>
        </div>

        {tab === 'reservation' && (
          <div className="space-y-3">
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full h-14 px-3 rounded-[12px] border border-[#E5E7EB] text-sm font-semibold"
            >
              <option value="">お客さんを選択</option>
              {clients.map((c) => (
                <option key={c.trainee_id} value={c.trainee_id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={menuId}
              onChange={(e) => setMenuId(e.target.value)}
              className="w-full h-14 px-3 rounded-[12px] border border-[#E5E7EB] text-sm font-semibold"
            >
              {menus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}（¥{m.price.toLocaleString()}）
                </option>
              ))}
            </select>
            <input
              type="time"
              step={300}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full h-14 px-3 rounded-[12px] border border-[#E5E7EB] text-sm font-semibold"
            />
          </div>
        )}

        {tab === 'block' && (
          <div className="text-sm text-[#6B7280] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[12px] p-3">
            この時間帯を予約不可（ブロック）にします。
          </div>
        )}

        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-[#0A0A0A]">
            <input
              type="checkbox"
              checked={repeatEnabled}
              onChange={(e) => setRepeatEnabled(e.target.checked)}
            />
            繰り返し設定
          </label>
          {repeatEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="date"
                value={repeatStart}
                onChange={(e) => setRepeatStart(e.target.value)}
                className="h-12 px-3 rounded-[12px] border border-[#E5E7EB] text-sm font-semibold"
              />
              <input
                type="date"
                value={repeatUntil}
                onChange={(e) => setRepeatUntil(e.target.value)}
                className="h-12 px-3 rounded-[12px] border border-[#E5E7EB] text-sm font-semibold"
              />
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-12 px-4 rounded-full border border-[#E5E7EB] text-sm font-bold text-[#6B7280]"
          >
            キャンセル
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void (tab === 'reservation' ? onSaveReservation() : onSaveBlock())}
            className="h-12 px-5 rounded-full bg-[#0A0A0A] text-white text-sm font-bold disabled:opacity-40"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
