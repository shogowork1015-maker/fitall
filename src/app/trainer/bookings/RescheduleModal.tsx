'use client'

import { useState } from 'react'
import { proposeRescheduleAction } from './actions'
import { Toast } from '@/components/Toast'
import { dayOfWeekForDateKey, formatJstDate, formatJstTime, upcomingJstDateKeys } from '@/lib/datetime'

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

// 日付キー（YYYY-MM-DD）から「5月3日」のような表示を作る。日本時間の暦で扱う
function formatDateKey(dateKey: string, options: Intl.DateTimeFormatOptions) {
  return formatJstDate(`${dateKey}T00:00:00+09:00`, options)
}

export function RescheduleModal({ bookingId, currentScheduledAt, onClose }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 明日から14日分。日本時間の朝9時前でも1日前にずれないよう日付キーで扱う
  const dateKeys = upcomingJstDateKeys(14)

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
        現在: {formatJstDate(currentScheduledAt, { month: 'long', day: 'numeric', weekday: 'short' })} {formatJstTime(currentScheduledAt)}
      </p>

      {error && (
        <div className="rounded-control border border-danger bg-danger-soft px-3 py-2 text-base font-bold text-danger">
          {error}
        </div>
      )}

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 gap-1">
        {dateKeys.map((iso) => {
          const day = dayOfWeekForDateKey(iso)
          const isSelected = selectedDate === iso
          const isSat = day === 6
          const isSun = day === 0
          return (
            <button
              key={iso}
              type="button"
              aria-pressed={isSelected}
              aria-label={formatDateKey(iso, { month: 'long', day: 'numeric', weekday: 'long' })}
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
              <span className="text-base font-bold">{Number(iso.slice(8, 10))}</span>
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
          {loading ? '送信中...' : `${formatDateKey(selectedDate, { month: 'short', day: 'numeric' })} ${selectedTime} に変更提案`}
        </button>
      )}
    </div>
  )
}
