'use client'

import { useState } from 'react'

interface WorkoutCalendarProps {
  workoutDates: string[] // 'YYYY-MM-DD' 形式
  streak: number
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export function WorkoutCalendar({ workoutDates, streak }: WorkoutCalendarProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const dateSet = new Set(workoutDates)
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  function isoDate(d: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
  }

  // 空マス + 日付
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  // 今月のトレーニング回数
  const thisMonthCount = workoutDates.filter((d) =>
    d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)
  ).length

  return (
    <div className="bg-white rounded-[20px] p-5 border border-[#E5E7EB] shadow-[0px_1px_3px_rgba(0,0,0,0.04),0px_1px_2px_rgba(0,0,0,0.06)]">
      {/* ストリーク + 今月回数 */}
      <div className="flex items-center gap-4 mb-5">
        <div className="flex-1">
          <p className="text-xs text-[#9CA3AF] font-medium mb-0.5">連続記録</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl leading-none">🔥</span>
            <span className="text-3xl font-black text-[#0A0A0A] leading-none tabular-nums">{streak}</span>
            <span className="text-sm text-[#9CA3AF]">日</span>
          </div>
        </div>
        <div className="h-10 w-px bg-[#E5E7EB]" />
        <div className="flex-1 text-right">
          <p className="text-xs text-[#9CA3AF] font-medium mb-0.5">今月の回数</p>
          <div className="flex items-baseline gap-1 justify-end">
            <span className="text-3xl font-black text-[#0A0A0A] leading-none tabular-nums">{thisMonthCount}</span>
            <span className="text-sm text-[#9CA3AF]">回</span>
          </div>
        </div>
      </div>

      {/* ヘッダー：月ナビ */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F3F4F6] text-[#6B7280] text-lg font-bold active:scale-[0.97] transition-transform"
        >
          ‹
        </button>
        <p className="text-sm font-bold text-[#0A0A0A]">
          {year}年{month + 1}月
        </p>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F3F4F6] text-[#6B7280] text-lg font-bold disabled:opacity-30 active:scale-[0.97] transition-transform"
        >
          ›
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <p
            key={d}
            className={`text-center text-[11px] font-semibold py-1 ${
              i === 0 ? 'text-[#EF4444]' : i === 6 ? 'text-[#0066FF]' : 'text-[#9CA3AF]'
            }`}
          >
            {d}
          </p>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} />
          const iso = isoDate(d)
          const worked = dateSet.has(iso)
          const isToday = iso === todayIso
          const dow = (firstDayOfWeek + d - 1) % 7

          return (
            <div key={iso} className="flex items-center justify-center py-0.5">
              <div
                className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold ${
                  worked && isToday
                    ? 'bg-[#22C55E] text-white'
                    : worked
                    ? 'bg-[#0A0A0A] text-white'
                    : isToday
                    ? 'ring-2 ring-[#0066FF] text-[#0066FF]'
                    : dow === 0
                    ? 'text-[#EF4444]'
                    : dow === 6
                    ? 'text-[#0066FF]'
                    : 'text-[#6B7280]'
                }`}
              >
                {d}
              </div>
            </div>
          )
        })}
      </div>

      {/* 凡例 */}
      <div className="flex gap-4 mt-4 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#0A0A0A]" />
          <span className="text-[11px] text-[#9CA3AF]">トレーニング済</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#22C55E]" />
          <span className="text-[11px] text-[#9CA3AF]">今日+済</span>
        </div>
      </div>
    </div>
  )
}
