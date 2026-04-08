'use client'

import { useState } from 'react'
import { Toast } from '@/components/Toast'
import { addMenuAction, deleteMenuAction, saveOperationSettingsAction } from './actions'
import type { TrainerOperationSettings } from '@/lib/trainer-settings'

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => `${String(i).padStart(2, '0')}:00`)
const SESSION_OPTIONS = [30, 45, 60, 75, 90, 120]

interface MenuItem {
  id: string
  name: string
  price: number
}

interface Props {
  initialSettings: TrainerOperationSettings
  initialMenus: MenuItem[]
}

export function TrainerSettingsForm({ initialSettings, initialMenus }: Props) {
  const [open, setOpen] = useState(initialSettings.business_open)
  const [close, setClose] = useState(initialSettings.business_close)
  const [sessionMinutes, setSessionMinutes] = useState(initialSettings.session_duration_minutes)
  const [menus, setMenus] = useState(initialMenus)
  const [newMenuName, setNewMenuName] = useState('')
  const [newMenuPrice, setNewMenuPrice] = useState('8000')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSaveSettings() {
    setError(null)
    setSaving(true)
    const result = await saveOperationSettingsAction({
      business_open: open,
      business_close: close,
      session_duration_minutes: sessionMinutes,
    })
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setToast('運営設定を保存しました')
  }

  async function onAddMenu() {
    setError(null)
    const price = Number(newMenuPrice)
    const result = await addMenuAction(newMenuName, Number.isFinite(price) ? price : 0)
    if (result.error) {
      setError(result.error)
      return
    }
    setToast('メニューを追加しました')
    window.location.reload()
  }

  async function onDeleteMenu(planId: string) {
    setError(null)
    const result = await deleteMenuAction(planId)
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
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[14px] px-4 py-3 text-sm text-[#EF4444]">
          {error}
        </div>
      )}

      <section className="bg-white rounded-[20px] border border-[#E5E7EB] p-4 space-y-3">
        <h2 className="text-base font-bold text-[#0A0A0A]">運営設定</h2>
        <p className="text-sm text-[#6B7280]">営業時間・1セッション時間を設定します</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select
            value={open}
            onChange={(e) => setOpen(e.target.value)}
            className="h-14 px-3 bg-white border border-[#E5E7EB] rounded-[12px] text-sm font-semibold text-[#0A0A0A] focus:outline-none focus:border-[#0066FF]"
          >
            {HOUR_OPTIONS.map((t) => (
              <option key={`open-${t}`} value={t}>
                営業開始 {t}
              </option>
            ))}
          </select>
          <select
            value={close}
            onChange={(e) => setClose(e.target.value)}
            className="h-14 px-3 bg-white border border-[#E5E7EB] rounded-[12px] text-sm font-semibold text-[#0A0A0A] focus:outline-none focus:border-[#0066FF]"
          >
            {HOUR_OPTIONS.map((t) => (
              <option key={`close-${t}`} value={t}>
                営業終了 {t}
              </option>
            ))}
          </select>
          <select
            value={sessionMinutes}
            onChange={(e) => setSessionMinutes(Number(e.target.value))}
            className="h-14 px-3 bg-white border border-[#E5E7EB] rounded-[12px] text-sm font-semibold text-[#0A0A0A] focus:outline-none focus:border-[#0066FF]"
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
          disabled={saving}
          className="w-full h-14 bg-[#0066FF] text-white text-sm font-bold rounded-[12px] disabled:opacity-40 active:scale-[0.98] transition-transform"
        >
          {saving ? '保存中...' : '運営設定を保存'}
        </button>
      </section>

      <section className="bg-white rounded-[20px] border border-[#E5E7EB] p-4 space-y-3">
        <h2 className="text-base font-bold text-[#0A0A0A]">メニュー管理</h2>
        <p className="text-sm text-[#6B7280]">トレーニングメニューを追加・削除できます</p>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-2">
          <input
            value={newMenuName}
            onChange={(e) => setNewMenuName(e.target.value)}
            placeholder="例: パーソナル60分"
            className="h-14 px-3 bg-white border border-[#E5E7EB] rounded-[12px] text-sm font-semibold text-[#0A0A0A] focus:outline-none focus:border-[#0066FF]"
          />
          <input
            type="number"
            min={0}
            value={newMenuPrice}
            onChange={(e) => setNewMenuPrice(e.target.value)}
            className="h-14 px-3 bg-white border border-[#E5E7EB] rounded-[12px] text-sm font-semibold text-[#0A0A0A] focus:outline-none focus:border-[#0066FF]"
          />
        </div>
        <button
          type="button"
          onClick={() => void onAddMenu()}
          className="w-full h-14 bg-[#0A0A0A] text-white text-sm font-bold rounded-[12px] active:scale-[0.98] transition-transform"
        >
          メニューを追加
        </button>

        {!menus.length ? (
          <div className="bg-[#F9FAFB] rounded-[14px] border border-[#E5E7EB] p-4 text-sm text-[#9CA3AF] text-center">
            まだメニューがありません
          </div>
        ) : (
          <div className="space-y-2">
            {menus.map((menu) => (
              <div
                key={menu.id}
                className="bg-[#F9FAFB] rounded-[14px] border border-[#E5E7EB] px-3 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-bold text-[#0A0A0A]">{menu.name}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">¥{menu.price.toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void onDeleteMenu(menu.id)}
                  className="h-10 px-3 rounded-full border border-[#E5E7EB] text-xs font-bold text-[#6B7280]"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
