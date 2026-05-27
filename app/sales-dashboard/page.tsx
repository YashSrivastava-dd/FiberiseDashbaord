'use client'

import { useEffect, useState, useMemo } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  CreditCard, 
  Truck, 
  RefreshCw, 
  Loader2, 
  AlertCircle, 
  Award,
  ChevronRight,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Coins,
  FileSpreadsheet,
  Search
} from 'lucide-react'

interface LineItem {
  id: number
  title: string
  variant_title: string | null
  sku: string | null
  quantity: number
  price: string
  total_discount: string
  fulfillment_status: string | null
}

interface Address {
  first_name?: string
  last_name?: string
  address1?: string
  address2?: string
  city?: string
  province?: string
  country?: string
  zip?: string
  phone?: string
}

interface ShopifyOrder {
  id: number
  name: string
  created_at: string
  financial_status: string
  fulfillment_status: string | null
  total_price: string
  currency: string
  cancelled_at?: string | null
  customer?: {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
  } | null
  shipping_address?: Address | null
  billing_address?: Address | null
  line_items: LineItem[]
  fulfillments?: Array<{
    id: number
    status: string
    tracking_number: string | null
    tracking_company: string | null
    tracking_url: string | null
    shipment_status: string | null
    created_at: string
  }>
}

export default function SalesDashboardPage() {
  const [orders, setOrders] = useState<ShopifyOrder[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState<boolean>(false)
  const [timeFilter, setTimeFilter] = useState<'all' | '30days' | '7days' | 'today'>('all')
  const [codSearch, setCodSearch] = useState<string>('')
  const [codRemittanceFilter, setCodRemittanceFilter] = useState<string>('all')
  const [codLogisticsFilter, setCodLogisticsFilter] = useState<string>('all')

  const [txSearch, setTxSearch] = useState<string>('')
  const [txPaymentFilter, setTxPaymentFilter] = useState<string>('all')
  const [txStatusFilter, setTxStatusFilter] = useState<string>('all')

  const fetchOrders = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true)
      // Use ?all=true to get the complete order list from cache (not just page 1 of 20)
      const url = forceRefresh
        ? '/api/shopify/orders?all=true&refresh=true'
        : '/api/shopify/orders?all=true'
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch sales database')
      setOrders(data.orders || [])
      setIsOffline(!!data.isOffline)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders(false) // Initial load: instant load from cache!
  }, [])

  const isOrderCancelled = (o: ShopifyOrder): boolean => {
    return (
      !!o.cancelled_at ||
      o.financial_status?.toLowerCase() === 'voided' ||
      o.financial_status?.toLowerCase() === 'cancelled' ||
      o.financial_status?.toLowerCase() === 'refunded' ||
      o.fulfillments?.[0]?.shipment_status === 'cancelled'
    )
  }

  // Filter orders based on time range and active cancelled status
  const processedOrders = useMemo(() => {
    return orders.filter((order) => {
      if (timeFilter === 'all') return true
      
      const orderDate = new Date(order.created_at)
      const now = new Date()
      const diffMs = now.getTime() - orderDate.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)

      if (timeFilter === '30days') return diffDays <= 30
      if (timeFilter === '7days') return diffDays <= 7
      if (timeFilter === 'today') {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        return orderDate >= todayStart
      }
      return true
    })
  }, [orders, timeFilter])

  // Aggregate stats from processed orders
  const metrics = useMemo(() => {
    const activeOrders = processedOrders.filter(o => !isOrderCancelled(o))
    const cancelledCount = processedOrders.filter(isOrderCancelled).length

    let totalRevenue = 0
    let prepaidCount = 0
    let codCount = 0
    let prepaidRevenue = 0
    let codRevenue = 0

    // COD Remittance breakdown
    let codTotalVolume = 0
    let codSettledCount = 0
    let codSettledRevenue = 0
    let codPendingCount = 0
    let codPendingRevenue = 0
    let codRtoCount = 0
    let codRtoRevenue = 0

    // Shiprocket Status counters
    let unfulfilledCount = 0
    let scheduledCount = 0
    let inTransitCount = 0
    let deliveredCount = 0
    let rtoCount = 0

    // SKU aggregation
    const skuMap: Record<string, { title: string; qty: number; revenue: number }> = {}

    activeOrders.forEach((o) => {
      const price = parseFloat(o.total_price) || 0
      totalRevenue += price

      // Payment method distribution
      const isPaid = o.financial_status?.toLowerCase() === 'paid'
      if (isPaid) {
        prepaidCount++
        prepaidRevenue += price
      } else {
        codCount++
        codRevenue += price

        // COD Remittance details mapping
        codTotalVolume += price
        const latest = o.fulfillments?.[0]
        const status = (latest?.shipment_status || '').toLowerCase()
        if (status === 'delivered') {
          codSettledCount++
          codSettledRevenue += price
        } else if (['failure', 'rto', 'returned'].includes(status)) {
          codRtoCount++
          codRtoRevenue += price
        } else {
          codPendingCount++
          codPendingRevenue += price
        }
      }

      // Shiprocket status distribution
      if (!o.fulfillment_status) {
        unfulfilledCount++
      } else {
        const latest = o.fulfillments?.[0]
        const status = (latest?.shipment_status || '').toLowerCase()
        if (status === 'delivered') {
          deliveredCount++
        } else if (['failure', 'rto', 'returned'].includes(status)) {
          rtoCount++
        } else if (['in_transit', 'out_for_delivery', 'attempted_delivery'].includes(status)) {
          inTransitCount++
        } else {
          scheduledCount++
        }
      }

      // Item aggregates
      o.line_items?.forEach((item) => {
        const sku = item.sku || 'N/A'
        const title = item.title || 'Starter pack'
        const qty = Number(item.quantity) || 1
        const itemVal = (parseFloat(item.price) || 0) * qty

        if (!skuMap[sku]) {
          skuMap[sku] = { title, qty: 0, revenue: 0 }
        }
        skuMap[sku].qty += qty
        skuMap[sku].revenue += itemVal
      })
    })

    const topProducts = Object.entries(skuMap)
      .map(([sku, data]) => ({ sku, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)

    const totalOrdersCount = activeOrders.length
    const aov = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0

    return {
      totalRevenue,
      totalOrders: totalOrdersCount,
      cancelledCount,
      aov,
      prepaidCount,
      prepaidRevenue,
      codCount,
      codRevenue,
      unfulfilledCount,
      scheduledCount,
      inTransitCount,
      deliveredCount,
      rtoCount,
      topProducts,
      codTotalVolume,
      codSettledCount,
      codSettledRevenue,
      codPendingCount,
      codPendingRevenue,
      codRtoCount,
      codRtoRevenue
    }
  }, [processedOrders])

  const filteredCodOrders = useMemo(() => {
    return processedOrders.filter((o) => {
      // Must be uncancelled and COD
      if (isOrderCancelled(o)) return false
      const isPaid = o.financial_status?.toLowerCase() === 'paid'
      if (isPaid) return false

      // Search match
      if (codSearch.trim() !== '') {
        const query = codSearch.toLowerCase()
        const orderName = (o.name || '').toLowerCase()
        const cName = o.customer 
          ? `${o.customer.first_name || ''} ${o.customer.last_name || ''}`.toLowerCase()
          : 'guest checkout'
        if (!orderName.includes(query) && !cName.includes(query)) {
          return false
        }
      }

      const latest = o.fulfillments?.[0]
      const status = (latest?.shipment_status || '').toLowerCase()

      // Remittance status filter
      if (codRemittanceFilter !== 'all') {
        if (o.fulfillment_status !== 'fulfilled') {
          if (codRemittanceFilter !== 'pending') return false
        } else {
          if (status === 'delivered') {
            if (codRemittanceFilter !== 'settled') return false
          } else if (['failure', 'rto', 'returned'].includes(status)) {
            if (codRemittanceFilter !== 'rto') return false
          } else {
            if (codRemittanceFilter !== 'pending') return false
          }
        }
      }

      // Logistics status filter
      if (codLogisticsFilter !== 'all') {
        if (!o.fulfillment_status) {
          if (codLogisticsFilter !== 'unfulfilled') return false
        } else {
          if (status === 'delivered') {
            if (codLogisticsFilter !== 'delivered') return false
          } else if (['failure', 'rto', 'returned'].includes(status)) {
            if (codLogisticsFilter !== 'rto') return false
          } else if (['in_transit', 'out_for_delivery', 'attempted_delivery'].includes(status)) {
            if (codLogisticsFilter !== 'transit') return false
          } else {
            if (codLogisticsFilter !== 'scheduled') return false
          }
        }
      }

      return true
    })
  }, [processedOrders, codSearch, codRemittanceFilter, codLogisticsFilter])

  const filteredTxOrders = useMemo(() => {
    return processedOrders.filter((o) => {
      // Search match
      if (txSearch.trim() !== '') {
        const query = txSearch.toLowerCase()
        const orderName = (o.name || '').toLowerCase()
        const cName = o.customer 
          ? `${o.customer.first_name || ''} ${o.customer.last_name || ''}`.toLowerCase()
          : 'guest checkout'
        if (!orderName.includes(query) && !cName.includes(query)) {
          return false
        }
      }

      // Payment method filter
      if (txPaymentFilter !== 'all') {
        const isPaid = o.financial_status?.toLowerCase() === 'paid'
        if (txPaymentFilter === 'prepaid' && !isPaid) return false
        if (txPaymentFilter === 'cod' && isPaid) return false
      }

      // Order / Logistics Status filter
      if (txStatusFilter !== 'all') {
        const isCancelled = isOrderCancelled(o)
        if (isCancelled) {
          if (txStatusFilter !== 'cancelled') return false
        } else if (!o.fulfillment_status) {
          if (txStatusFilter !== 'unfulfilled') return false
        } else {
          const latest = o.fulfillments?.[0]
          const status = (latest?.shipment_status || '').toLowerCase()
          if (status === 'delivered') {
            if (txStatusFilter !== 'delivered') return false
          } else if (['failure', 'rto', 'returned'].includes(status)) {
            if (txStatusFilter !== 'rto') return false
          } else if (['in_transit', 'out_for_delivery', 'attempted_delivery'].includes(status)) {
            if (txStatusFilter !== 'transit') return false
          } else {
            if (txStatusFilter !== 'scheduled') return false
          }
        }
      } else {
        // Exclude cancelled orders by default from the general money transaction lists
        if (isOrderCancelled(o)) return false
      }

      return true
    })
  }, [processedOrders, txSearch, txPaymentFilter, txStatusFilter])

  const formattedRevenue = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(metrics.totalRevenue)

  const formattedAOV = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(metrics.aov)

  return (
    <div className="min-h-screen bg-[#07090e] text-white">
      <Sidebar />
      <TopBar />

      <main className="ml-0 lg:ml-64 p-4 lg:p-6 transition-all duration-300">
        <div className="max-w-7xl mx-auto mt-20">
          
          {/* Header & Filter Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="px-2.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-semibold">
                  Live Analytics Engine
                </div>
                {loading && (
                  <div className="flex items-center gap-1.5 text-xs text-white/40">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Syncing...</span>
                  </div>
                )}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-purple-400 bg-clip-text text-transparent">
                Real-Time Sales Dashboard
              </h1>
            </div>

            {/* Time Presets & Refresh */}
            <div className="flex items-center gap-2">
              <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
                {(['all', '30days', '7days', 'today'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                      timeFilter === filter 
                        ? 'bg-purple-600 text-white shadow-md' 
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {filter === '30days' ? 'Last 30 Days' : filter === '7days' ? 'Last 7 Days' : filter}
                  </button>
                ))}
              </div>

              <button
                onClick={() => fetchOrders(true)}
                disabled={loading}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 active:scale-95 transition-all"
                title="Refresh Live Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {isOffline && (
            <div className="mb-6 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
              <span>🔌 <strong>Offline / Demo Mode:</strong> External Shopify & Shiprocket endpoints are currently unreachable (getaddrinfo ENOTFOUND). Showing realistic simulated data for dashboard evaluation.</span>
            </div>
          )}

          {error && !isOffline && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Failed to fetch real-time logs: {error}</span>
            </div>
          )}

          {loading && orders.length === 0 ? (
            <div className="py-24 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-purple-400 mx-auto mb-4" />
              <p className="text-sm text-white/50 font-medium">Aggregating real-time transactions & compiling sales charts...</p>
            </div>
          ) : (
            <>
              {/* Metric Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                
                {/* Revenue Card */}
                <div className="bg-card rounded-2xl p-6 border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-purple-500/30 transition-all">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-2xl group-hover:scale-150 transition-all"></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Total Revenue</p>
                      <h3 className="text-3xl font-extrabold text-white tracking-tight">{formattedRevenue}</h3>
                      <p className="text-[10px] text-emerald-400 font-semibold mt-2 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Live Shopify Sync</span>
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Orders Card */}
                <div className="bg-card rounded-2xl p-6 border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-teal-500/10 rounded-full blur-2xl group-hover:scale-150 transition-all"></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Total Orders</p>
                      <h3 className="text-3xl font-extrabold text-white tracking-tight">{metrics.totalOrders}</h3>
                      <p className="text-[10px] text-white/50 font-normal mt-2 flex items-center gap-1">
                        <span>Excludes {metrics.cancelledCount} Cancelled attempts</span>
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* AOV Card */}
                <div className="bg-card rounded-2xl p-6 border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-full blur-2xl group-hover:scale-150 transition-all"></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Average Order Value</p>
                      <h3 className="text-3xl font-extrabold text-white tracking-tight">{formattedAOV}</h3>
                      <p className="text-[10px] text-emerald-400 font-semibold mt-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span>Ticket size optimization</span>
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Return Rate Card */}
                <div className="bg-card rounded-2xl p-6 border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-red-500/30 transition-all">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-full blur-2xl group-hover:scale-150 transition-all"></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">RTO Returns Rate</p>
                      <h3 className="text-3xl font-extrabold text-white tracking-tight">
                        {metrics.totalOrders > 0 
                          ? `${((metrics.rtoCount / metrics.totalOrders) * 100).toFixed(1)}%` 
                          : '0%'}
                      </h3>
                      <p className="text-[10px] text-red-400 font-semibold mt-2 flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>RTO cases: {metrics.rtoCount}</span>
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/20 text-red-400 flex items-center justify-center">
                      <Truck className="w-5 h-5" />
                    </div>
                  </div>
                </div>

              </div>

              {/* Advanced Analytics Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                
                {/* Prepaid vs COD distribution chart */}
                <div className="bg-card border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between">
                  <div>
                    <h2 className="text-white font-extrabold text-lg mb-1 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-purple-400" />
                      Payment Distribution
                    </h2>
                    <p className="text-xs text-white/50 mb-6">Real-time payment type allocation & share of total sales.</p>
                  </div>

                  {/* Visual progress bars */}
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-2">
                        <span className="text-emerald-400">Prepaid orders ({metrics.prepaidCount})</span>
                        <span className="text-white">
                          {metrics.totalOrders > 0 
                            ? `${((metrics.prepaidCount / metrics.totalOrders) * 100).toFixed(1)}%` 
                            : '0%'}
                        </span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden border border-white/5">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${metrics.totalOrders > 0 ? (metrics.prepaidCount / metrics.totalOrders) * 100 : 0}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-white/40 mt-1.5">Prepaid sales volume: ₹{metrics.prepaidRevenue.toLocaleString('en-IN')}</p>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-2">
                        <span className="text-yellow-400">Cash on Delivery ({metrics.codCount})</span>
                        <span className="text-white">
                          {metrics.totalOrders > 0 
                            ? `${((metrics.codCount / metrics.totalOrders) * 100).toFixed(1)}%` 
                            : '0%'}
                        </span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden border border-white/5">
                        <div 
                          className="bg-yellow-500 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${metrics.totalOrders > 0 ? (metrics.codCount / metrics.totalOrders) * 100 : 0}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-white/40 mt-1.5">COD pending realization: ₹{metrics.codRevenue.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  <div className="border-t border-white/5 mt-6 pt-4 text-[10px] text-white/40">
                    Calculated from {metrics.totalOrders} live sales conversions.
                  </div>
                </div>

                {/* Shiprocket Delivery Funnel */}
                <div className="bg-card border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                  <h2 className="text-white font-extrabold text-lg mb-1 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-purple-400" />
                    Delivery Funnel Breakdown
                  </h2>
                  <p className="text-xs text-white/50 mb-6">Real-time status tracking of all active Shiprocket shipments.</p>

                  <div className="space-y-3.5 text-xs font-semibold">
                    {[
                      { label: 'Unfulfilled / New', count: metrics.unfulfilledCount, color: 'bg-blue-500', text: 'text-blue-300' },
                      { label: 'Pickup Scheduled / Printed', count: metrics.scheduledCount, color: 'bg-yellow-500/70', text: 'text-yellow-300/80' },
                      { label: 'In Transit / Out for Delivery', count: metrics.inTransitCount, color: 'bg-yellow-500', text: 'text-yellow-300' },
                      { label: 'Delivered', count: metrics.deliveredCount, color: 'bg-green-500', text: 'text-emerald-300' },
                      { label: 'RTO / Returned to Origin', count: metrics.rtoCount, color: 'bg-red-500', text: 'text-red-300' }
                    ].map((item, index) => {
                      const pct = metrics.totalOrders > 0 ? (item.count / metrics.totalOrders) * 100 : 0
                      return (
                        <div key={index} className="flex items-center gap-4">
                          <span className={`w-28 text-white/60 font-medium truncate ${item.text}`}>{item.label}</span>
                          <div className="flex-1 bg-white/5 rounded-md h-2.5 overflow-hidden border border-white/5">
                            <div 
                              className={`${item.color} h-full transition-all duration-1000`} 
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-white font-bold">{item.count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Top Selling Products */}
                <div className="bg-card border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between">
                  <div>
                    <h2 className="text-white font-extrabold text-lg mb-1 flex items-center gap-2">
                      <Award className="w-4 h-4 text-purple-400" />
                      Top Performing SKUs
                    </h2>
                    <p className="text-xs text-white/50 mb-6">Top selling products aggregated across live line items.</p>
                  </div>

                  <div className="space-y-4">
                    {metrics.topProducts.length === 0 ? (
                      <p className="text-xs text-white/40 py-8 text-center">No product metrics resolved in selected range.</p>
                    ) : (
                      metrics.topProducts.map((p, index) => (
                        <div key={p.sku} className="flex items-center justify-between border-b border-white/5 pb-2.5 last:border-0 last:pb-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-300 shrink-0">
                              {index + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate" title={p.title}>{p.title}</p>
                              <p className="text-[10px] text-white/40 mt-0.5">SKU: {p.sku}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold text-white">{p.qty} units</p>
                            <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">₹{p.revenue.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* COD Remittance & Settlement Tracker */}
              <div className="bg-card border border-white/10 rounded-3xl p-6 backdrop-blur-xl mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-white font-extrabold text-xl flex items-center gap-2">
                      <Coins className="w-5 h-5 text-yellow-400" />
                      COD Remittance & Settlement Tracker
                    </h2>
                    <p className="text-xs text-white/50">Real-time ledger of Cash on Delivery cashflow, logistics status, and payout realization.</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Quick summary of ratios */}
                    <div className="text-right hidden sm:block">
                      <span className="text-[10px] text-white/40 block font-semibold uppercase">Settled Rate</span>
                      <span className="text-sm font-bold text-emerald-400">
                        {metrics.codTotalVolume > 0 
                          ? `${((metrics.codSettledRevenue / metrics.codTotalVolume) * 100).toFixed(1)}%`
                          : '0.0%'}
                      </span>
                    </div>
                    <div className="h-8 w-px bg-white/10 hidden sm:block" />
                    <div className="text-right hidden sm:block">
                      <span className="text-[10px] text-white/40 block font-semibold uppercase">Pending Rate</span>
                      <span className="text-sm font-bold text-yellow-400">
                        {metrics.codTotalVolume > 0 
                          ? `${((metrics.codPendingRevenue / metrics.codTotalVolume) * 100).toFixed(1)}%`
                          : '0.0%'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* COD Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  
                  {/* Card 1: Total COD Pool */}
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                      <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-1">Total COD Volume</p>
                      <h4 className="text-xl font-extrabold text-white">₹{metrics.codTotalVolume.toLocaleString('en-IN')}</h4>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[10px]">
                      <span className="text-white/50">{metrics.codCount} Orders</span>
                      <span className="text-white/30">100% of COD</span>
                    </div>
                  </div>

                  {/* Card 2: Received / Settled */}
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                      <p className="text-emerald-400/70 text-[10px] font-bold uppercase tracking-wider mb-1">Received & Settled</p>
                      <h4 className="text-xl font-extrabold text-emerald-400">₹{metrics.codSettledRevenue.toLocaleString('en-IN')}</h4>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[10px]">
                      <span className="text-emerald-400/60">{metrics.codSettledCount} Delivered Orders</span>
                      <span className="text-emerald-400/40">
                        {metrics.codTotalVolume > 0 ? `${((metrics.codSettledRevenue / metrics.codTotalVolume) * 100).toFixed(0)}%` : '0%'}
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Pending Collection */}
                  <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                      <p className="text-yellow-400/70 text-[10px] font-bold uppercase tracking-wider mb-1">Pending Collection</p>
                      <h4 className="text-xl font-extrabold text-yellow-400">₹{metrics.codPendingRevenue.toLocaleString('en-IN')}</h4>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[10px]">
                      <span className="text-yellow-400/60">{metrics.codPendingCount} In-Transit / Active</span>
                      <span className="text-yellow-400/40">
                        {metrics.codTotalVolume > 0 ? `${((metrics.codPendingRevenue / metrics.codTotalVolume) * 100).toFixed(0)}%` : '0%'}
                      </span>
                    </div>
                  </div>

                  {/* Card 4: Lost / RTO Unrealized */}
                  <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                      <p className="text-red-400/70 text-[10px] font-bold uppercase tracking-wider mb-1">RTO / Unrealized COD</p>
                      <h4 className="text-xl font-extrabold text-red-400">₹{metrics.codRtoRevenue.toLocaleString('en-IN')}</h4>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[10px]">
                      <span className="text-red-400/60">{metrics.codRtoCount} Failed / RTO Orders</span>
                      <span className="text-red-400/40">
                        {metrics.codTotalVolume > 0 ? `${((metrics.codRtoRevenue / metrics.codTotalVolume) * 100).toFixed(0)}%` : '0%'}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Visual Remittance Splitter Bar */}
                <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5 flex mb-6">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-1000" 
                    style={{ width: `${metrics.codTotalVolume > 0 ? (metrics.codSettledRevenue / metrics.codTotalVolume) * 100 : 0}%` }}
                    title={`Settled: ${metrics.codTotalVolume > 0 ? ((metrics.codSettledRevenue / metrics.codTotalVolume) * 100).toFixed(1) : 0}%`}
                  />
                  <div 
                    className="bg-yellow-500 h-full transition-all duration-1000" 
                    style={{ width: `${metrics.codTotalVolume > 0 ? (metrics.codPendingRevenue / metrics.codTotalVolume) * 100 : 0}%` }}
                    title={`Pending: ${metrics.codTotalVolume > 0 ? ((metrics.codPendingRevenue / metrics.codTotalVolume) * 100).toFixed(1) : 0}%`}
                  />
                  <div 
                    className="bg-red-500 h-full transition-all duration-1000" 
                    style={{ width: `${metrics.codTotalVolume > 0 ? (metrics.codRtoRevenue / metrics.codTotalVolume) * 100 : 0}%` }}
                    title={`RTO: ${metrics.codTotalVolume > 0 ? ((metrics.codRtoRevenue / metrics.codTotalVolume) * 100).toFixed(1) : 0}%`}
                  />
                </div>

                 {/* COD Orders Ledger Table */}
                 <div>
                   <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
                     <h3 className="text-white text-sm font-bold flex items-center gap-1.5 shrink-0">
                       <FileSpreadsheet className="w-4 h-4 text-purple-400" />
                       COD Remittance Ledger
                     </h3>
                     
                     <div className="flex flex-col sm:flex-row gap-3 items-center w-full xl:w-auto xl:justify-end">
                       {/* Search Input */}
                       <div className="relative w-full sm:w-60 shrink-0">
                         <input
                           type="text"
                           placeholder="Search Order ID or Customer..."
                           value={codSearch}
                           onChange={(e) => setCodSearch(e.target.value)}
                           className="w-full pl-9 pr-4 py-1.5 text-xs bg-white/5 border border-white/10 rounded-xl focus:border-purple-500/50 focus:outline-none text-white placeholder-white/30"
                         />
                         <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                       </div>
                       
                       {/* Remittance Filter */}
                       <div className="flex items-center gap-1.5 w-full sm:w-auto">
                         <span className="text-[10px] text-white/40 font-bold uppercase shrink-0">Remittance:</span>
                         <select
                           value={codRemittanceFilter}
                           onChange={(e) => setCodRemittanceFilter(e.target.value)}
                           className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] text-white/80 focus:outline-none focus:border-purple-500/50 cursor-pointer w-full sm:w-36"
                         >
                           <option value="all">All Remittances</option>
                           <option value="settled">Settled & Received</option>
                           <option value="pending">Pending Collection</option>
                           <option value="rto">RTO Unrealized</option>
                         </select>
                       </div>

                       {/* Logistics Filter */}
                       <div className="flex items-center gap-1.5 w-full sm:w-auto">
                         <span className="text-[10px] text-white/40 font-bold uppercase shrink-0">Logistics:</span>
                         <select
                           value={codLogisticsFilter}
                           onChange={(e) => setCodLogisticsFilter(e.target.value)}
                           className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] text-white/80 focus:outline-none focus:border-purple-500/50 cursor-pointer w-full sm:w-36"
                         >
                           <option value="all">All Logistics</option>
                           <option value="unfulfilled">Unfulfilled</option>
                           <option value="scheduled">Pickup Scheduled</option>
                           <option value="transit">In Transit</option>
                           <option value="delivered">Delivered</option>
                           <option value="rto">RTO / Failed</option>
                         </select>
                       </div>
                     </div>
                   </div>
                   
                   <div className="overflow-x-auto border border-white/5 rounded-2xl max-h-[380px] overflow-y-auto custom-scrollbar scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
                     <table className="min-w-full text-xs text-left border-collapse">
                       <thead className="sticky top-0 bg-[#0d111d] z-10 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                         <tr className="text-white/40 border-b border-white/5 font-bold">
                           <th className="px-4 py-3 bg-[#0d111d]">Order</th>
                           <th className="px-4 py-3 bg-[#0d111d]">Customer</th>
                           <th className="px-4 py-3 bg-[#0d111d]">Logistics Status</th>
                           <th className="px-4 py-3 bg-[#0d111d]">Fulfillment Status</th>
                           <th className="px-4 py-3 bg-[#0d111d]">Remittance Status</th>
                           <th className="px-4 py-3 text-right bg-[#0d111d]">Amount</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5 text-white/80">
                         {filteredCodOrders.map((o) => {
                           const cName = o.customer 
                             ? `${o.customer.first_name || ''} ${o.customer.last_name || ''}`.trim() 
                             : 'Guest Checkout'
                           
                           const latest = o.fulfillments?.[0]
                           const status = (latest?.shipment_status || '').toLowerCase()
                           
                           let logisticsStatus = 'Unfulfilled'
                           let logisticsBadge = 'bg-white/5 text-white/50 border-white/10'
                           
                           let remittanceStatus = 'Pending Collection'
                           let remittanceBadge = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'

                           if (o.fulfillment_status === 'fulfilled') {
                             if (status === 'delivered') {
                               logisticsStatus = 'Delivered'
                               logisticsBadge = 'bg-green-500/10 text-green-400 border-green-500/20'
                               remittanceStatus = 'Settled & Received'
                               remittanceBadge = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                             } else if (['failure', 'rto', 'returned'].includes(status)) {
                               logisticsStatus = 'RTO / Failed'
                               logisticsBadge = 'bg-red-500/10 text-red-400 border-red-500/20'
                               remittanceStatus = 'RTO Unrealized'
                               remittanceBadge = 'bg-red-500/15 text-red-400 border-red-500/25'
                             } else {
                               logisticsStatus = status ? status.replace('_', ' ').toUpperCase() : 'In Transit'
                               logisticsBadge = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                               remittanceStatus = 'Pending Collection'
                               remittanceBadge = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                             }
                           }

                           return (
                             <tr key={o.id} className="hover:bg-white/5 transition-all">
                               <td className="px-4 py-3 font-bold text-purple-400">{o.name}</td>
                               <td className="px-4 py-3 font-medium">
                                 <div>{cName}</div>
                                 <div className="text-[10px] text-white/30 mt-0.5">{o.shipping_address?.city || 'N/A'}, {o.shipping_address?.province || ''}</div>
                               </td>
                               <td className="px-4 py-3">
                                 <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${logisticsBadge}`}>
                                   {logisticsStatus}
                                 </span>
                               </td>
                               <td className="px-4 py-3 text-white/50 font-medium">
                                 {o.fulfillment_status ? 'Fulfilled' : 'Unfulfilled'}
                               </td>
                               <td className="px-4 py-3">
                                 <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${remittanceBadge}`}>
                                   {remittanceStatus}
                                 </span>
                               </td>
                               <td className="px-4 py-3 text-right font-extrabold text-white">₹{parseFloat(o.total_price || '0').toLocaleString('en-IN')}</td>
                             </tr>
                           )
                         })}
                         {filteredCodOrders.length === 0 && (
                           <tr>
                             <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                               No active COD transactions found matching the selected filters.
                             </td>
                           </tr>
                         )}
                       </tbody>
                     </table>
                   </div>
                 </div>
               </div>

              {/* Live sales feed table */}
              <div className="bg-card border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-white font-extrabold text-lg">Live Transactions Log</h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                        Live Data Feed
                      </span>
                    </div>
                    <p className="text-xs text-white/50">Real-time incoming orders chronological sales feed.</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 items-center w-full xl:w-auto xl:justify-end">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-60 shrink-0">
                      <input
                        type="text"
                        placeholder="Search Order ID or Customer..."
                        value={txSearch}
                        onChange={(e) => setTxSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 text-xs bg-white/5 border border-white/10 rounded-xl focus:border-purple-500/50 focus:outline-none text-white placeholder-white/30"
                      />
                      <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                    
                    {/* Payment Filter */}
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <span className="text-[10px] text-white/40 font-bold uppercase shrink-0">Payment:</span>
                      <select
                        value={txPaymentFilter}
                        onChange={(e) => setTxPaymentFilter(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] text-white/80 focus:outline-none focus:border-purple-500/50 cursor-pointer w-full sm:w-36"
                      >
                        <option value="all">All Payments</option>
                        <option value="prepaid">Prepaid</option>
                        <option value="cod">Cash on Delivery</option>
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <span className="text-[10px] text-white/40 font-bold uppercase shrink-0">Status:</span>
                      <select
                        value={txStatusFilter}
                        onChange={(e) => setTxStatusFilter(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] text-white/80 focus:outline-none focus:border-purple-500/50 cursor-pointer w-full sm:w-36"
                      >
                        <option value="all">All Statuses</option>
                        <option value="unfulfilled">Unfulfilled</option>
                        <option value="scheduled">Pickup Scheduled</option>
                        <option value="transit">In Transit</option>
                        <option value="delivered">Delivered</option>
                        <option value="rto">RTO</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border border-white/5 rounded-2xl max-h-[380px] overflow-y-auto custom-scrollbar scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
                  <table className="min-w-full text-xs text-left border-collapse">
                    <thead className="sticky top-0 bg-[#0d111d] z-10 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                      <tr className="text-white/40 border-b border-white/10 font-bold">
                        <th className="px-5 py-3.5 bg-[#0d111d]">Order</th>
                        <th className="px-5 py-3.5 bg-[#0d111d]">Customer</th>
                        <th className="px-5 py-3.5 bg-[#0d111d]">Date</th>
                        <th className="px-5 py-3.5 bg-[#0d111d]">Payment</th>
                        <th className="px-5 py-3.5 bg-[#0d111d]">Status</th>
                        <th className="px-5 py-3.5 text-right bg-[#0d111d]">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white/80">
                      {filteredTxOrders.map((o) => {
                        const isCancelled = isOrderCancelled(o)
                        const cName = o.customer 
                          ? `${o.customer.first_name || ''} ${o.customer.last_name || ''}`.trim() 
                          : 'Guest Checkout'
                        
                        let displayStatus = 'Unfulfilled'
                        let statusColor = 'bg-white/5 text-white/60 border-white/10'

                        if (isCancelled) {
                          displayStatus = 'Cancelled'
                          statusColor = 'bg-red-500/10 text-red-400 border-red-500/20'
                        } else if (o.fulfillment_status === 'fulfilled') {
                          const latest = o.fulfillments?.[0]
                          const status = (latest?.shipment_status || '').toLowerCase()
                          if (status === 'delivered') {
                            displayStatus = 'Delivered'
                            statusColor = 'bg-green-500/10 text-green-400 border-green-500/20'
                          } else if (['failure', 'rto', 'returned'].includes(status)) {
                            displayStatus = 'RTO'
                            statusColor = 'bg-red-500/10 text-red-400 border-red-500/20'
                          } else if (['in_transit', 'out_for_delivery'].includes(status)) {
                            displayStatus = 'In Transit'
                            statusColor = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          } else {
                            displayStatus = 'Pickup Scheduled'
                            statusColor = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          }
                        }

                        return (
                          <tr key={o.id} className="hover:bg-white/5 transition-all align-middle">
                            <td className="px-5 py-3.5 font-bold text-purple-400">{o.name}</td>
                            <td className="px-5 py-3.5 font-medium">{cName}</td>
                            <td className="px-5 py-3.5 text-white/50">
                              {new Date(o.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                                o.financial_status === 'paid' 
                                  ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                  : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                              }`}>
                                {o.financial_status === 'paid' ? 'Prepaid' : 'COD'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${statusColor}`}>
                                {displayStatus}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right font-bold text-white">₹{parseFloat(o.total_price || '0').toLocaleString('en-IN')}</td>
                          </tr>
                        )
                      })}
                      {filteredTxOrders.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-white/40">
                            No transactions found matching the selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  )
}
