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
    <div className="mt-3 bg-[#F8F9FA] rounded-[16px] p-4 border border-[#E5E7EB] space-y-4">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-[#0A0A0A]">新しい日時を選択</p>
        <button
          onClick={onClose}
          className="text-[#9CA3AF] text-sm font-medium"
        >
          キャンセル
        </button>
      </div>

      <p className="text-xs text-[#6B7280]">
        現在: {currentDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })} {currentDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
      </p>

      {error && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[12px] px-3 py-2 text-xs text-[#EF4444]">
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
              className={`flex flex-col items-center py-1.5 rounded-[10px] transition-colors ${
                isSelected
                  ? 'bg-[#0066FF] text-white'
                  : isSun
                  ? 'bg-[#FEF2F2] text-[#EF4444]'
                  : isSat
                  ? 'bg-[#EFF6FF] text-[#0066FF]'
                  : 'bg-white text-[#0A0A0A] border border-[#E5E7EB]'
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
              className={`h-10 text-sm font-semibold rounded-full transition-colors ${
                selectedTime === t
                  ? 'bg-[#0066FF] text-white'
                  : 'bg-white text-[#0A0A0A] border border-[#E5E7EB]'
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
          className="w-full h-12 bg-[#0A0A0A] text-white text-sm font-bold rounded-full disabled:opacity-40 active:scale-[0.97] transition-transform"
        >
          {loading ? '送信中...' : `${new Date(selectedDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })} ${selectedTime} に変更提案`}
        </button>
      )}
    </div>
  )
}
