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
      <div className="p-4 text-center text-sm text-[#A0A0A0]">
        体重記録がありません
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#A0A0A0', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#A0A0A0', fontSize: 10 }}
            unit="kg"
            axisLine={false}
            tickLine={false}
            width={42}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0A0A0A',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '12px',
            }}
            formatter={(v) => [`${Number(v)}kg`, '体重']}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#0066FF"
            strokeWidth={2.5}
            dot={{ fill: '#0066FF', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
          {data.some((d) => d.bodyFat != null) && (
            <Line
              type="monotone"
              dataKey="bodyFat"
              stroke="#0A0A0A"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={{ fill: '#0A0A0A', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
