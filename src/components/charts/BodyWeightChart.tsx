'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export type BodyWeightData = { date: string; weight: number; bodyFat?: number | null }

export function BodyWeightChart({ data }: { data: BodyWeightData[] }) {
  if (!data.length) {
    return (
      <div className="bg-[#0A0A0A] rounded-[20px] p-6 text-center text-sm text-[#6B7280]">
        体重記録がありません
      </div>
    )
  }

  return (
    <div className="bg-[#0A0A0A] rounded-[20px] p-4">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1C1C1E',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '12px',
            }}
            formatter={(v) => [`${Number(v)}kg`, '体重']}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#0066FF"
            strokeWidth={2}
            dot={{ fill: '#0066FF', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
          {data.some((d) => d.bodyFat != null) && (
            <Line
              type="monotone"
              dataKey="bodyFat"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={{ fill: '#F59E0B', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
