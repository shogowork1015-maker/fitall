'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export type ExerciseChartData = {
  id: string
  name: string
  data: { date: string; weight: number }[]
}

export function ExerciseWeightChart({
  exercises,
}: {
  exercises: ExerciseChartData[]
}) {
  const [selectedId, setSelectedId] = useState<string>(exercises[0]?.id ?? '')
  const selected = exercises.find((e) => e.id === selectedId)

  if (!exercises.length) {
    return (
      <div className="bg-[#0A0A0A] rounded-[20px] p-6 text-center text-sm text-[#6B7280]">
        30日以内のトレーニング記録がありません
      </div>
    )
  }

  return (
    <div className="bg-[#0A0A0A] rounded-[20px] p-4">
      {/* 種目選択タブ */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {exercises.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => setSelectedId(ex.id)}
            className={`flex-shrink-0 px-3 h-8 rounded-full text-xs font-semibold transition-colors ${
              selectedId === ex.id
                ? 'bg-[#0066FF] text-white'
                : 'bg-[#1C1C1E] text-[#6B7280]'
            }`}
          >
            {ex.name}
          </button>
        ))}
      </div>

      {selected && selected.data.length >= 1 ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={selected.data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6B7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6B7280', fontSize: 10 }}
              unit="kg"
              axisLine={false}
              tickLine={false}
              width={42}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1C1C1E',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
              }}
              formatter={(v) => [`${Number(v)}kg`, '最大重量']}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#0066FF"
              strokeWidth={2}
              dot={{ fill: '#0066FF', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center text-sm text-[#6B7280] py-10">
          この種目のデータがありません
        </div>
      )}
    </div>
  )
}
