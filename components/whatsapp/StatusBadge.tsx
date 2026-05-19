'use client'

import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: 'active' | 'paused' | 'completed' | 'sent' | 'failed' | 'pending' | string
  className?: string
}

const statusStyles: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  active: {
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    label: 'Active',
  },
  paused: {
    bg: 'bg-amber-500/10 border-amber-500/30',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    label: 'Paused',
  },
  completed: {
    bg: 'bg-blue-500/10 border-blue-500/30',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
    label: 'Completed',
  },
  sent: {
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    label: 'Sent',
  },
  failed: {
    bg: 'bg-red-500/10 border-red-500/30',
    text: 'text-red-400',
    dot: 'bg-red-400',
    label: 'Failed',
  },
  pending: {
    bg: 'bg-orange-500/10 border-orange-500/30',
    text: 'text-orange-400',
    dot: 'bg-orange-400',
    label: 'Pending',
  },
}

/**
 * Color-coded status badge with animated dot indicator.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status] || statusStyles.pending

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border',
        style.bg,
        style.text,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', style.dot)} />
      {style.label}
    </span>
  )
}
