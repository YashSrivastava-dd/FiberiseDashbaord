'use client'

import { memo } from 'react'

import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: string
    isPositive: boolean
  }
  icon?: React.ReactNode
  gradient?: string
  loading?: boolean
}

function StatCardComponent({ title, value, subtitle, trend, icon, gradient, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-white/10 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-24 mb-4"></div>
        <div className="h-8 bg-white/10 rounded w-32 mb-2"></div>
        <div className="h-3 bg-white/10 rounded w-20"></div>
      </div>
    )
  }

  return (
    <div className={cn(
      'bg-card rounded-2xl p-6 border border-white/10 hover:border-purple-500/30 transition-all',
      gradient && `bg-gradient-to-br ${gradient}`
    )}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-white/60 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
          {subtitle && <p className="text-white/40 text-xs">{subtitle}</p>}
        </div>
        {icon && <div className="text-white/60">{icon}</div>}
      </div>
      {trend && (
        <div className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium',
          trend.isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        )}>
          <span>{trend.isPositive ? '↑' : '↓'}</span>
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  )
}

export const StatCard = memo(StatCardComponent)
