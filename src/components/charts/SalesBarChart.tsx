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

export function SalesBarChart({ data }: { data: MonthlySales[] }) {
  if (!data.length) {
    return (
      <div className="bg-[#0A0A0A] rounded-[20px] p-6 text-center text-sm text-[#6B7280]">
        売上データがありません
      </div>
    )
  }

  return (
    <div className="bg-[#0A0A0A] rounded-[20px] p-4">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6B7280', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v) =>
              v >= 10000 ? `${(v / 10000).toFixed(0)}万` : `${v}`
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1C1C1E',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '12px',
            }}
            formatter={(v) => [`¥${Number(v).toLocaleString()}`, '売上']}
          />
          <Bar dataKey="amount" fill="#0066FF" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
