'use client'

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

interface ChartSectionProps {
  title: string
  data: any[]
  type?: 'line' | 'bar' | 'area'
  loading?: boolean
}

export function ChartSection({ title, data, type = 'line', loading }: ChartSectionProps) {
  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-white/10 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-48 mb-4"></div>
        <div className="h-64 bg-white/10 rounded"></div>
      </div>
    )
  }

  const chartConfig = {
    stroke: '#667eea',
    fill: 'url(#colorGradient)',
  }

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/10">
      {title && <h3 className="text-white font-semibold mb-6">{title}</h3>}
      <ResponsiveContainer width="100%" height={title ? 300 : 200}>
        {type === 'line' ? (
          <LineChart data={data}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="name" stroke="#ffffff40" />
            <YAxis stroke="#ffffff40" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#12172A',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Area type="monotone" dataKey="value" stroke="#667eea" fill="url(#colorGradient)" />
            <Line type="monotone" dataKey="value" stroke="#667eea" strokeWidth={2} dot={false} />
          </LineChart>
        ) : type === 'bar' ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="name" stroke="#ffffff40" />
            <YAxis stroke="#ffffff40" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#12172A',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Bar dataKey="value" fill="#667eea" radius={[8, 8, 0, 0]} />
          </BarChart>
        ) : (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="name" stroke="#ffffff40" />
            <YAxis stroke="#ffffff40" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#12172A',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Area type="monotone" dataKey="value" stroke="#667eea" fill="url(#colorGradient)" />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
