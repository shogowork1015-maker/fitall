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
    <div className="fitall-fade mt-3 space-y-4 rounded-control bg-surface-soft p-3">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <p className="text-base font-bold text-ink">新しい日時を選択</p>
        <button
          onClick={onClose}
          className="text-base font-medium text-ink-muted"
        >
          キャンセル
        </button>
      </div>

      <p className="text-base text-ink-muted">
        現在: {currentDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })} {currentDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
      </p>

      {error && (
        <div className="rounded-control border border-danger bg-danger-soft px-3 py-2 text-base font-bold text-danger">
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
              className={`flex min-h-16 flex-col items-center justify-center rounded-control leading-tight ${
                isSelected
                  ? 'bg-accent text-ink'
                  : isSun
                  ? 'bg-white text-ink border border-line'
                  : isSat
                  ? 'bg-accent-soft text-brand'
                  : 'bg-white text-ink border border-line'
              }`}
            >
              <span className="text-base font-medium">{WEEKDAYS[day]}</span>
              <span className="text-base font-bold">{d.getDate()}</span>
            </button>
          )
        })}
      </div>

      {/* 時間スロット */}
      {selectedDate && (
        <div className="grid grid-cols-3 gap-2">
          {TIME_SLOTS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedTime(t)}
              className={`rounded-control font-bold ${
                selectedTime === t
                  ? 'bg-accent text-ink'
                  : 'bg-white text-ink border border-line'
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
          className="fitall-primary-action disabled:opacity-40"
        >
          {loading ? '送信中...' : `${new Date(selectedDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })} ${selectedTime} に変更提案`}
        </button>
      )}
    </div>
  )
}
