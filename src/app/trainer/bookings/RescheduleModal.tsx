'use client'

import { useState } from 'react'
import { proposeRescheduleAction } from './actions'
import { Toast } from '@/components/Toast'

interface Props {
  bookingId: string
  currentScheduledAt: string
  onClose: () => void
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
]

function getAvailableDates() {
  const dates = []
  const today = new Date()
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.push(d)
  }
  return dates
}

export function RescheduleModal({ bookingId, currentScheduledAt, onClose }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const dates = getAvailableDates()
  const currentDate = new Date(currentScheduledAt)

  async function handleSubmit() {
    if (!selectedDate || !selectedTime) return
    setLoading(true)
    setError(null)
    const newDateTime = `${selectedDate}T${selectedTime}:00`
    const result = await proposeRescheduleAction(bookingId, newDateTime)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setToast('日時変更の提案を送りました')
      setTimeout(onClose, 1500)
    }
  }

  return (
    <div className="mt-3 space-y-4 rounded-[6px] border-2 border-[#DDE8E8] bg-[#F4F7F7] p-4">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-[#0A0A0A]">新しい日時を選択</p>
        <button
          onClick={onClose}
          className="text-sm font-black text-[#555555]"
        >
          キャンセル
        </button>
      </div>

      <p className="text-xs text-[#6B7280]">
        現在: {currentDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })} {currentDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
      </p>

      {error && (
        <div className="rounded-[6px] border-2 border-[#D4183D] bg-[#FEF2F2] px-3 py-2 text-xs font-bold text-[#D4183D]">
          {error}
        </div>
      )}

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 gap-1">
        {dates.map((d) => {
          const iso = d.toISOString().split('T')[0]!
          const day = d.getDay()
          const isSelected = selectedDate === iso
          const isSat = day === 6
          const isSun = day === 0
          return (
            <button
              key={iso}
              type="button"
              onClick={() => { setSelectedDate(iso); setSelectedTime(null) }}
              className={`flex flex-col items-center rounded-[6px] py-1.5 transition-colors ${
                isSelected
                  ? 'bg-[#12C7BE] text-white'
                  : isSun
                  ? 'bg-white text-[#0A0A0A] border border-[#DDE8E8]'
                  : isSat
                  ? 'bg-[#E8FBFA] text-[#087D78]'
                  : 'bg-white text-[#0A0A0A] border border-[#DDE8E8]'
              }`}
            >
              <span className="text-[9px] font-medium">{WEEKDAYS[day]}</span>
              <span className="text-xs font-bold">{d.getDate()}</span>
            </button>
          )
        })}
      </div>

      {/* 時間スロット */}
      {selectedDate && (
        <div className="grid grid-cols-4 gap-1.5">
          {TIME_SLOTS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedTime(t)}
              className={`h-10 rounded-[6px] text-sm font-black transition-colors ${
                selectedTime === t
                  ? 'bg-[#12C7BE] text-white'
                  : 'bg-white text-[#0A0A0A] border border-[#DDE8E8]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {selectedDate && selectedTime && (
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="h-12 w-full rounded-[6px] bg-[#0A0A0A] text-sm font-black text-white transition-transform active:scale-[0.97] disabled:opacity-40"
        >
          {loading ? '送信中...' : `${new Date(selectedDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })} ${selectedTime} に変更提案`}
        </button>
      )}
    </div>
  )
}
