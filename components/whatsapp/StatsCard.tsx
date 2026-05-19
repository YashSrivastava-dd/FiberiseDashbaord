'use client'

import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: string
  trendUp?: boolean
  gradient: 'emerald' | 'blue' | 'red' | 'purple' | 'amber' | 'teal'
  className?: string
}

const gradientStyles: Record<string, { icon: string; ring: string }> = {
  emerald: {
    icon: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
    ring: 'shadow-emerald-500/10',
  },
  blue: {
    icon: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400',
    ring: 'shadow-blue-500/10',
  },
  red: {
    icon: 'bg-gradient-to-br from-red-500/20 to-rose-500/20 border-red-500/30 text-red-400',
    ring: 'shadow-red-500/10',
  },
  purple: {
    icon: 'bg-gradient-to-br from-purple-500/20 to-violet-500/20 border-purple-500/30 text-purple-400',
    ring: 'shadow-purple-500/10',
  },
  amber: {
    icon: 'bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-amber-500/30 text-amber-400',
    ring: 'shadow-amber-500/10',
  },
  teal: {
    icon: 'bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border-teal-500/30 text-teal-400',
    ring: 'shadow-teal-500/10',
  },
}

/**
 * Analytics stats card with icon, value, and optional trend indicator.
 */
export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  gradient,
  className,
}: StatsCardProps) {
  const style = gradientStyles[gradient]

  return (
    <div
      className={cn(
        'bg-card rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 group',
        `hover:${style.ring}`,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/50 text-sm mb-1 font-medium">{title}</p>
          <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
          {trend && (
            <p
              className={cn(
                'text-xs font-semibold mt-2',
                trendUp ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110',
            style.icon
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}
