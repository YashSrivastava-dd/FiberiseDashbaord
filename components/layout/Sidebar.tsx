'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Bell, ShoppingBag, Ticket, PackagePlus } from 'lucide-react'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: ShoppingBag, label: 'Orders', href: '/orders' },
  { icon: PackagePlus, label: 'Create Order', href: '/shiprocket/create-order' },
  { icon: Ticket, label: 'Support Tickets', href: '/tickets' },
  { icon: Bell, label: 'Advertisements', href: '/notifications' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-card border-r border-white/10 transition-all duration-300 z-40 hidden lg:block',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="flex flex-col h-full p-4">
        <div className="flex items-center justify-between mb-8">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500"></div>
              <span className="text-white font-semibold text-sm">Fiberise Fit</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href === '/' && pathname === '/')
            return (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                  isActive
                    ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border border-purple-500/30'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
