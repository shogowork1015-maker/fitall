'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export type MonthlySales = { month: string; amount: number }

export function SalesBarChart({ data, dark }: { data: MonthlySales[]; dark?: boolean }) {
  if (!data.length) {
    return (
      <div className="text-center text-sm text-gray-500 py-4">
        売上データがありません
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#2F3A3A' : '#DDE8E8'} vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: dark ? '#B7F3EF' : '#555555', fontSize: 10, fontWeight: 700 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: dark ? '#B7F3EF' : '#555555', fontSize: 9, fontWeight: 700 }}
          axisLine={false}
          tickLine={false}
          width={36}
          tickFormatter={(v) =>
            v >= 10000 ? `${(v / 10000).toFixed(0)}万` : `${v}`
          }
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#0A0A0A',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: '600',
          }}
          labelStyle={{ color: '#12C7BE' }}
          formatter={(v) => [`¥${Number(v).toLocaleString()}`, '売上']}
        />
        <Bar dataKey="amount" fill="#12C7BE" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
