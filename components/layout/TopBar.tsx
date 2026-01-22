'use client'

import { Heart, Bell, Menu } from 'lucide-react'

export function TopBar() {
  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-card backdrop-blur-lg border-b border-white/10 flex items-center justify-between px-4 lg:px-6 z-30 shadow-lg">
      <div className="flex items-center gap-4">
        <button className="lg:hidden text-white/60 hover:text-white">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button className="text-white/60 hover:text-white transition-colors">
          <Heart className="w-5 h-5" />
        </button>
        <button className="relative text-white/60 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
            5
          </span>
        </button>
        <button className="text-white/60 hover:text-white transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
