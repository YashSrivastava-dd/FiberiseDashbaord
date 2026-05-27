'use client'

import { useState, useEffect, useRef } from 'react'
import { Heart, Bell, Menu, X, Check, Trash2, ShoppingBag, Sparkles, BellRing } from 'lucide-react'

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface AppNotification {
  id: string
  title: string
  body: string
  time: string
  unread: boolean
  type: 'order' | 'system'
  orderName?: string
}

export function TopBar() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null)
  const [pulseBell, setPulseBell] = useState(false)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const baselineIdsRef = useRef<Set<number>>(new Set())

  // 1. Initialise and load notifications from LocalStorage
  useEffect(() => {
    const cached = localStorage.getItem('fiberise_notifications')
    if (cached) {
      const parsed: AppNotification[] = JSON.parse(cached)
      setNotifications(parsed)
      // Seed baseline from already-seen order notifications so they won't be re-detected
      parsed.forEach((n) => {
        if (n.type === 'order') {
          const id = parseInt(n.id.replace('notif-', ''), 10)
          if (!isNaN(id)) baselineIdsRef.current.add(id)
        }
      })
    } else {
      const defaults: AppNotification[] = [
        {
          id: 'notif-1',
          title: 'FCM Service Connected',
          body: 'Google FCM credentials synchronized successfully.',
          time: '10 mins ago',
          unread: true,
          type: 'system'
        },
        {
          id: 'notif-2',
          title: 'Shopify Sync Active',
          body: 'Successfully connected and listening for live order changes.',
          time: '35 mins ago',
          unread: false,
          type: 'system'
        }
      ]
      setNotifications(defaults)
      localStorage.setItem('fiberise_notifications', JSON.stringify(defaults))
    }
  }, [])

  // 2. Click outside dropdown handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 3. Silent Shopify Live Polling Listener (No Mock Creator!)
  useEffect(() => {
    const checkNewOrders = async (isFirstRun: boolean) => {
      try {
        const res = await fetch('/api/shopify/orders')
        if (!res.ok) return
        
        const data = await res.json()
        const fetchedOrders = data.orders || []

        if (isFirstRun) {
          // Establish the initial baseline of existing orders in the Shopify store
          fetchedOrders.forEach((o: any) => baselineIdsRef.current.add(o.id))
          return
        }

        // Compare fetched orders with the baseline to detect real new Shopify orders
        const newOrders = fetchedOrders.filter((o: any) => !baselineIdsRef.current.has(o.id))
        
        if (newOrders.length > 0) {
          newOrders.forEach((newOrder: any) => {
            baselineIdsRef.current.add(newOrder.id)

            const customerName = newOrder.customer
              ? `${newOrder.customer.first_name || ''} ${newOrder.customer.last_name || ''}`.trim()
              : 'Guest Checkout'
            const city = newOrder.shipping_address?.city || 'India'
            const itemTitle = newOrder.line_items?.[0]?.title || 'Products'
            const totalPriceFormatted = `₹${newOrder.total_price}`

            const newNotif: AppNotification = {
              id: `notif-${newOrder.id}`,
              title: `🎉 New Shopify Order ${newOrder.name}`,
              body: `${customerName} from ${city} placed an order for ${itemTitle} (Total: ${totalPriceFormatted})`,
              time: 'Just now',
              unread: true,
              type: 'order',
              orderName: newOrder.name
            }

            setNotifications((prev) => {
              // Deduplicate — skip if this notification ID already exists
              if (prev.some((n) => n.id === newNotif.id)) return prev
              const updated = [newNotif, ...prev]
              localStorage.setItem('fiberise_notifications', JSON.stringify(updated))
              return updated
            })

            // Trigger visual bell notification pulse
            setPulseBell(true)
            setTimeout(() => setPulseBell(false), 2000)

            // Trigger slide-in viewport toast notification
            setActiveToast(newNotif)

            // Dispatch custom event to dynamically update the active order tables
            const event = new CustomEvent('shopify_new_order_received', { detail: newOrder })
            window.dispatchEvent(event)
          })
        }
      } catch (err) {
        console.error('Silent Shopify order poll error:', err)
      }
    }

    // Run baseline setup
    checkNewOrders(true).then(() => {
      // Setup live silent poll interval checking the Shopify API every 15 seconds
      const interval = setInterval(() => {
        checkNewOrders(false)
      }, 15000)
      return () => clearInterval(interval)
    })
  }, [])

  // 4. Auto-dismiss active toast after 6.5 seconds
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null)
      }, 6500)
      return () => clearTimeout(timer)
    }
  }, [activeToast])

  const unreadCount = notifications.filter((n) => n.unread).length

  // ── Handlers ──
  
  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, unread: false }))
    setNotifications(updated)
    localStorage.setItem('fiberise_notifications', JSON.stringify(updated))
  }

  const handleMarkSingleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = notifications.map((n) => n.id === id ? { ...n, unread: false } : n)
    setNotifications(updated)
    localStorage.setItem('fiberise_notifications', JSON.stringify(updated))
  }

  const handleClearAll = () => {
    setNotifications([])
    localStorage.setItem('fiberise_notifications', JSON.stringify([]))
    setShowDropdown(false)
  }

  return (
    <>
      <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-[#0e121a]/85 backdrop-blur-lg border-b border-white/10 flex items-center justify-between px-4 lg:px-6 z-30 shadow-lg select-none">
        
        {/* Mobile menu trigger */}
        <div className="flex items-center gap-4">
          <button className="lg:hidden text-white/60 hover:text-white transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Global Nav Tools */}
        <div className="flex items-center gap-4">
          <button className="text-white/60 hover:text-white transition-colors">
            <Heart className="w-5 h-5" />
          </button>

          {/* 🔔 LIVE BELL ICON CONTAINER */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className={`relative text-white/60 hover:text-white transition-all duration-300 p-1.5 rounded-lg hover:bg-white/5 ${
                pulseBell ? 'scale-110 text-purple-400' : ''
              }`}
            >
              {pulseBell ? (
                <BellRing className="w-5 h-5 text-purple-400 animate-bounce" />
              ) : (
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-purple-300' : ''}`} />
              )}

              {/* Pulsing indicator circle */}
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md shadow-purple-500/20 border border-[#0e121a] animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* ── PRESETS GLASSMORPHIC DROPDOWN ── */}
            {showDropdown && (
              <div className="absolute right-0 mt-3 w-80 bg-[#0e121a]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-scale-up">
                
                {/* Dropdown Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
                  <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Notifications
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-extrabold uppercase transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notifications Scrollable List */}
                <div className="max-h-64 overflow-y-auto pr-0.5 divide-y divide-white/5">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center text-white/40 text-xs font-semibold">
                      All clean! No notifications.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          // Mark read on click
                          const updated = notifications.map((item) => item.id === n.id ? { ...item, unread: false } : item)
                          setNotifications(updated)
                          localStorage.setItem('fiberise_notifications', JSON.stringify(updated))
                        }}
                        className={`p-4 text-left transition-colors cursor-pointer flex gap-3 items-start ${
                          n.unread ? 'bg-purple-950/10 hover:bg-purple-950/15' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          n.type === 'order' 
                            ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' 
                            : 'bg-white/5 border-white/10 text-white/50'
                        }`}>
                          <ShoppingBag className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs truncate font-bold text-white ${n.unread ? 'text-purple-300' : ''}`}>
                              {n.title}
                            </p>
                            {n.unread && (
                              <button
                                onClick={(e) => handleMarkSingleRead(n.id, e)}
                                className="w-4 h-4 rounded bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 flex items-center justify-center text-purple-300 shrink-0"
                                title="Mark read"
                              >
                                <Check className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-white/50 leading-relaxed font-normal mt-0.5 break-words">
                            {n.body}
                          </p>
                          <span className="text-[9px] text-white/30 font-semibold block mt-1.5">{n.time}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Dropdown Footer */}
                {notifications.length > 0 && (
                  <div className="p-2 border-t border-white/10 bg-white/5 text-center">
                    <button
                      onClick={handleClearAll}
                      className="inline-flex items-center justify-center gap-1 w-full py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 text-[10px] font-extrabold uppercase transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear all logs
                    </button>
                  </div>
                )}

              </div>
            )}

          </div>

          {/* Navigation/Profile placeholder */}
          <button className="text-white/60 hover:text-white transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        </div>

      </header>

      {/* ── 🚀 LIVE VIEWPORT ORDER TOAST NOTIFICATION OVERLAY ── */}
      {activeToast && (
        <div className="fixed top-20 right-4 lg:right-6 z-[9999] w-full max-w-sm bg-[#0e121a]/95 border border-purple-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-slide-left select-none">
          <div className="flex gap-3.5 items-start">
            
            {/* Glowing Order bag */}
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center border border-purple-500/30 shrink-0 text-purple-300 relative shadow-inner animate-pulse">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0e121a]"></span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Shopify Order Dispatch
                </span>
                <button
                  onClick={() => setActiveToast(null)}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs font-bold text-purple-300 mt-1">{activeToast.title}</p>
              <p className="text-xs text-white/70 leading-normal font-semibold mt-1">
                {activeToast.body}
              </p>

              {/* Action buttons on toast */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                <button
                  onClick={() => {
                    setActiveToast(null)
                    // Trigger a custom event to instruct orders page to handle without hard reload
                    const ev = new CustomEvent('shopify_view_live_order', { detail: activeToast.orderName })
                    window.dispatchEvent(ev)
                  }}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-[10px] font-extrabold text-white transition-colors"
                >
                  View Order
                </button>
                <button
                  onClick={() => setActiveToast(null)}
                  className="px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[10px] font-bold text-white/60 hover:text-white transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
