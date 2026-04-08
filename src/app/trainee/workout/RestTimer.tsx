'use client'

import { useEffect, useState } from 'react'

interface RestTimerProps {
  duration: number // 秒
  onDone: () => void
  onSkip: () => void
}

export function RestTimer({ duration, onDone, onSkip }: RestTimerProps) {
  const [remaining, setRemaining] = useState(duration)

  useEffect(() => {
    if (remaining <= 0) {
      onDone()
      return
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining, onDone])

  const radius = 20
  const circumference = 2 * Math.PI * radius
  const progress = (duration - remaining) / duration
  const strokeDashoffset = circumference * (1 - progress)

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const timeStr = mins > 0
    ? `${mins}:${String(secs).padStart(2, '0')}`
    : `${secs}`

  return (
    <div className="fixed bottom-20 inset-x-0 mx-4 z-40 pointer-events-none">
      <div className="bg-[#0A0A0A] text-white rounded-[20px] px-5 py-3 shadow-2xl flex items-center gap-4 pointer-events-auto">
        {/* 円形カウントダウン */}
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
            <circle
              cx="24" cy="24" r={radius}
              fill="none" stroke="#262626" strokeWidth="4"
            />
            <circle
              cx="24" cy="24" r={radius}
              fill="none" stroke="#0066FF" strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white">
            {timeStr}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-[#6B7280] font-medium">インターバル中</p>
          <p className="text-base font-bold truncate">
            {mins > 0 ? `${mins}:${String(secs).padStart(2, '0')} 残り` : `${secs}秒 残り`}
          </p>
        </div>

        <button
          onClick={onSkip}
          className="flex-shrink-0 px-4 h-9 bg-[#262626] rounded-full text-sm font-semibold transition-colors active:scale-[0.97]"
        >
          スキップ
        </button>
      </div>
    </div>
  )
}
