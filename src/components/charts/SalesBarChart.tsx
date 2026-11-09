'use client'

import {
  BarChart,
  Bar,
  Cell,
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
      <div className="text-center text-subhead text-ink-muted py-4">
        売上データがありません
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={dark ? '#2F3A3A' : '#ECEDEF'} vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: dark ? '#B7F3EF' : '#6D6D72', fontSize: 13, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: dark ? '#B7F3EF' : '#6D6D72', fontSize: 13, fontWeight: 500 }}
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
            borderRadius: '10px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '600',
          }}
          labelStyle={{ color: '#12C7BE' }}
          formatter={(v) => [`¥${Number(v).toLocaleString()}`, '売上']}
        />
        {/* 今月（最後の棒）だけアクアで強調し、過去の月は淡くする */}
        <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={28}>
          {data.map((entry, index) => (
            <Cell key={entry.month} fill={index === data.length - 1 ? '#12C7BE' : '#CDEFEC'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
