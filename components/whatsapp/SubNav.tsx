'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Route, MessageSquare, FileText, BarChart3, ScrollText } from 'lucide-react'

const tabs = [
  { label: 'Journeys', href: '/whatsapp/journeys', icon: Route },
  { label: 'Templates', href: '/whatsapp/templates', icon: FileText },
  { label: 'Message Logs', href: '/whatsapp/logs', icon: ScrollText },
  { label: 'Analytics', href: '/whatsapp/analytics', icon: BarChart3 },
]

/**
 * Sub-navigation tabs for WhatsApp dashboard pages.
 * Renders as horizontal pill-style tabs with active indicator.
 */
export function SubNav() {
  const pathname = usePathname()

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = pathname === tab.href

        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch={false}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
              isActive
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-white border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
            )}
          >
            <Icon className={cn('w-4 h-4', isActive ? 'text-emerald-400' : 'text-white/40')} />
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
