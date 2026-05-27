'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Bell, ShoppingBag, Ticket, PackagePlus, MessageCircle, LogOut, TrendingUp, ShieldCheck } from 'lucide-react'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: TrendingUp, label: 'Sales Analytics', href: '/sales-dashboard' },
  { icon: ShoppingBag, label: 'Orders', href: '/orders' },
  { icon: PackagePlus, label: 'Create Order', href: '/shiprocket/create-order' },
  { icon: MessageCircle, label: 'WhatsApp', href: '/whatsapp' },
  { icon: Ticket, label: 'Support Tickets', href: '/tickets' },
  { icon: Bell, label: 'Advertisements', href: '/notifications' },
  { icon: ShieldCheck, label: 'Audit Logs', href: '/audit-logs' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState<{ email: string; role: string; ipAddress?: string } | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // 1. Initialise sidebar state
  useEffect(() => {
    const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true'
    setCollapsed(isCollapsed)
    if (isCollapsed) {
      document.documentElement.setAttribute('data-sidebar-collapsed', 'true')
    } else {
      document.documentElement.removeAttribute('data-sidebar-collapsed')
    }
  }, [])

  // 2. Fetch and monitor auth session state dynamically
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json().catch(() => ({}))
        
        if (!res.ok || !data.authenticated) {
          // If kicked out due to concurrent session
          if (data.error && data.error.includes('Another login was detected')) {
            router.push('/login?reason=concurrent_login')
          } else {
            router.push('/login')
          }
          router.refresh()
        } else {
          setUser(data.user)
        }
      } catch (err) {
        console.error('Failed to run auth check:', err)
      }
    }

    checkAuth()
    // Poll session validity every 10 seconds
    const interval = setInterval(checkAuth, 10000)
    return () => clearInterval(interval)
  }, [router])

  const handleToggle = () => {
    const nextCollapsed = !collapsed
    setCollapsed(nextCollapsed)
    localStorage.setItem('sidebar_collapsed', String(nextCollapsed))
    if (nextCollapsed) {
      document.documentElement.setAttribute('data-sidebar-collapsed', 'true')
    } else {
      document.documentElement.removeAttribute('data-sidebar-collapsed')
    }
  }

  // Gate navigation items securely: only show Audit Logs if user is admin or super_admin
  const visibleMenuItems = menuItems.filter(item => {
    if (item.label === 'Audit Logs') {
      return user?.role === 'admin' || user?.role === 'super_admin'
    }
    return true
  })

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
              <div className="flex flex-col">
                <span className="text-white font-semibold text-sm leading-tight">Fiberise Fit</span>
                {user && (
                  <span className="text-[10px] text-purple-400 font-mono capitalize leading-none mt-0.5">
                    {user.role.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          )}
          <button
            onClick={handleToggle}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
          {visibleMenuItems.map((item, index) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href === '/' && pathname === '/')
            return (
              <Link
                key={index}
                href={item.href}
                prefetch={false}
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

        {/* 🛡️ SUPER ADMIN IP TRACING HUD CARD */}
        {user?.role === 'super_admin' && (
          <div className="mt-4 mb-2">
            {!collapsed ? (
              <div className="p-3.5 bg-red-950/20 border border-red-500/30 rounded-2xl relative overflow-hidden shadow-lg shadow-red-950/30 select-none animate-fade-in">
                {/* Visual red radar aura */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  <span className="text-[10px] text-red-400 font-extrabold tracking-widest uppercase font-mono">
                    IP TRACING HUD
                  </span>
                </div>
                
                <div className="space-y-1.5 font-mono text-[10px]">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Logged IP:</span>
                    <span className="text-red-300 font-bold select-all">{user.ipAddress || '127.0.0.1'}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Telemetry:</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                      Tracing Active
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Audit Log:</span>
                    <span className="text-slate-300 text-right truncate max-w-[90px]" title={user.email}>
                      Immutable
                    </span>
                  </div>
                </div>
                
                <div className="mt-3 pt-2.5 border-t border-red-500/10 flex items-center justify-between">
                  <span className="text-[9px] text-red-400/60 font-semibold uppercase tracking-wider font-mono">
                    SECURE CONSOLE
                  </span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20 text-center font-bold">
                    SHIELD ACTIVE
                  </span>
                </div>
              </div>
            ) : (
              <div 
                className="flex justify-center p-2 rounded-xl bg-red-950/20 border border-red-500/30"
                title={`Super Admin Tracing IP: ${user.ipAddress || '127.0.0.1'}`}
              >
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Logout Action */}
        <div className="mt-auto pt-4 border-t border-white/10 select-none">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer text-left focus:outline-none"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}
