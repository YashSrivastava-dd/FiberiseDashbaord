'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Loader2, RefreshCw, ShoppingBag, AlertCircle, FileText, FileSpreadsheet, FileBadge2, Search, Calendar, ArrowUp, ArrowDown, SlidersHorizontal, X } from 'lucide-react'

interface ShopifyOrder {
  id: number
  name: string
  created_at: string
  financial_status: string
  fulfillment_status: string | null
  total_price: string
  currency: string
  customer?: {
    first_name?: string
    last_name?: string
    email?: string
  } | null
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

// ─── Helpers consistent with detail view ──────────────────────────────────
function Badge({ label, variant = 'default' }: { label: string; variant?: 'green' | 'yellow' | 'red' | 'blue' | 'default' }) {
  const colors = {
    green:   'bg-green-500/15 text-green-300 border-green-500/30',
    yellow:  'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    red:     'bg-red-500/15 text-red-300 border-red-500/30',
    blue:    'bg-blue-500/15 text-blue-300 border-blue-500/30',
    default: 'bg-white/5 text-white/70 border-white/10',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[variant]}`}>
      {label}
    </span>
  )
}

function statusVariant(status: string | null): 'green' | 'yellow' | 'red' | 'blue' | 'default' {
  if (!status) return 'default'
  const s = status.toLowerCase()
  if (['paid', 'fulfilled', 'delivered'].some(v => s.includes(v))) return 'green'
  if (['pending', 'partial', 'in_transit', 'out_for_delivery', 'attempted_delivery'].some(v => s.includes(v))) return 'yellow'
  if (['refunded', 'voided', 'cancelled', 'failed', 'failure'].some(v => s.includes(v))) return 'red'
  if (['authorized'].some(v => s.includes(v))) return 'blue'
  return 'default'
}

function getDeliveryStatusInfo(order: ShopifyOrder) {
  if (!order.fulfillment_status) {
    return { label: 'Unfulfilled', variant: 'default' as const }
  }
  
  const fulfillments = order.fulfillments || []
  if (fulfillments.length === 0) {
    return { label: 'Fulfilled', variant: 'green' as const }
  }
  
  const latest = fulfillments[0]
  if (!latest || !latest.shipment_status) {
    return { label: 'Fulfilled', variant: 'green' as const }
  }
  
  const status = latest.shipment_status.toLowerCase()
  switch (status) {
    case 'delivered':
      return { label: 'Delivered', variant: 'green' as const }
    case 'in_transit':
      return { label: 'In Transit', variant: 'yellow' as const }
    case 'out_for_delivery':
      return { label: 'Out for Delivery', variant: 'yellow' as const }
    case 'failure':
      return { label: 'Delivery Failed', variant: 'red' as const }
    case 'attempted_delivery':
      return { label: 'Attempted', variant: 'yellow' as const }
    case 'confirmed':
      return { label: 'Confirmed', variant: 'blue' as const }
    case 'label_printed':
    case 'label_purchased':
      return { label: 'Label Printed', variant: 'blue' as const }
    default:
      const cap = latest.shipment_status.charAt(0).toUpperCase() + latest.shipment_status.slice(1)
      return { label: cap, variant: 'default' as const }
  }
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<ShopifyOrder[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [shiprocketLoadingOrderId, setShiprocketLoadingOrderId] = useState<number | null>(null)
  const [shiprocketError, setShiprocketError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(false)
  const [financialFilter, setFinancialFilter] = useState<string>('all')
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('all')
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const activeFiltersCount = [
    financialFilter !== 'all',
    fulfillmentFilter !== 'all',
    minPrice !== '',
    maxPrice !== '',
    startDate !== '',
    endDate !== ''
  ].filter(Boolean).length

  const filteredAndSortedOrders = orders
    .filter((order) => {
      // 1. Text Search query
      const q = searchQuery.toLowerCase().trim()
      if (q) {
        const orderName = order.name?.toLowerCase() || ''
        const orderId = order.id?.toString() || ''
        const customerName = order.customer
          ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.toLowerCase()
          : ''
        const customerEmail = order.customer?.email?.toLowerCase() || ''

        const matchesQuery =
          orderName.includes(q) ||
          orderId.includes(q) ||
          customerName.includes(q) ||
          customerEmail.includes(q)

        if (!matchesQuery) return false
      }

      // 2. Financial Status Filter
      if (financialFilter !== 'all') {
        const status = order.financial_status?.toLowerCase() || ''
        if (status !== financialFilter.toLowerCase()) return false
      }

      // 3. Fulfillment Status Filter
      if (fulfillmentFilter !== 'all') {
        const topFulfillmentStatus = (order.fulfillment_status || 'unfulfilled').toLowerCase()
        if (fulfillmentFilter === 'unfulfilled') {
          if (topFulfillmentStatus !== 'unfulfilled') return false
        } else if (fulfillmentFilter === 'fulfilled') {
          if (topFulfillmentStatus !== 'fulfilled') return false
        } else {
          const latest = order.fulfillments?.[0]
          const shipStatus = (latest?.shipment_status || '').toLowerCase()
          if (shipStatus !== fulfillmentFilter.toLowerCase()) return false
        }
      }

      // 4. Total Price Filter
      const price = parseFloat(order.total_price)
      if (!isNaN(price)) {
        if (minPrice && price < parseFloat(minPrice)) return false
        if (maxPrice && price > parseFloat(maxPrice)) return false
      }

      // 5. Date Range Filter
      if (startDate || endDate) {
        const orderDate = new Date(order.created_at)
        if (startDate) {
          const start = new Date(startDate)
          start.setHours(0, 0, 0, 0)
          if (orderDate < start) return false
        }
        if (endDate) {
          const end = new Date(endDate)
          end.setHours(23, 59, 59, 999)
          if (orderDate > end) return false
        }
      }

      return true
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/shopify/orders')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to fetch Shopify orders')
      }

      const data = await res.json()
      setOrders(data.orders || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Shopify orders')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const openInNewTab = (url?: string) => {
    if (!url) return
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleShiprocketAction = async (
    type: 'label' | 'manifest' | 'invoice',
    order: ShopifyOrder
  ) => {
    try {
      setShiprocketError(null)
      setShiprocketLoadingOrderId(order.id)

      // Send Shopify order.name (e.g. "#1021") so the API can resolve the
      // matching Shiprocket order via channel_order_id lookup
      const res = await fetch(`/api/shiprocket/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNames: [order.name] }),
      })

      const data = await res.json()
      if (!res.ok) {
        // Show raw Shiprocket response if available so we can debug
        const detail = data.raw ? ` | Raw: ${JSON.stringify(data.raw)}` : ''
        throw new Error((data.error || `Failed to fetch ${type} from Shiprocket`) + detail)
      }

      const url = data.labelUrl || data.manifestUrl || data.invoiceUrl
      if (!url) {
        throw new Error(`No ${type} URL returned from Shiprocket. Response: ${JSON.stringify(data)}`)
      }

      openInNewTab(url)
    } catch (err: any) {
      setShiprocketError(err.message || 'Shiprocket action failed')
    } finally {
      setShiprocketLoadingOrderId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <TopBar />

      <main className="ml-0 lg:ml-64 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto mt-20">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2 flex items-center gap-2">
                  <ShoppingBag className="w-7 h-7 text-purple-400" />
                  Shopify Orders
                </h1>
                <p className="text-white/60 text-sm">
                  View recent orders fetched directly from your Shopify store.
                </p>
              </div>
              <button
                onClick={fetchOrders}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Error state */}
          {(error || shiprocketError) && (
            <div className="mb-4 p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <div>
                <p className="font-medium">There was a problem</p>
                {error && <p className="mt-1 opacity-80">Orders: {error}</p>}
                {shiprocketError && <p className="mt-1 opacity-80">Shiprocket: {shiprocketError}</p>}
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                <p className="text-white/60 text-sm">Fetching latest orders from Shopify...</p>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center border border-dashed border-white/15 rounded-2xl bg-card/40">
              <div className="text-center">
                <ShoppingBag className="w-8 h-8 text-white/40 mx-auto mb-3" />
                <p className="text-white font-medium mb-1">No orders found</p>
                <p className="text-white/60 text-sm">
                  Once customers place orders in your Shopify store, they will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-white font-semibold text-sm">
                  Orders <span className="text-white/50 font-normal">({filteredAndSortedOrders.length})</span>
                </p>

                {/* Search & Sort Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  {/* Search input */}
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                    <input
                      type="text"
                      placeholder="Search order, customer..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-2.5 text-xs text-white/40 hover:text-white/80"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Advanced Filters Trigger */}
                  <button
                    onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                    className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                      showFiltersPanel || activeFiltersCount > 0
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                        : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="text-xs">Filters</span>
                    {activeFiltersCount > 0 && (
                      <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-purple-500 text-white animate-pulse">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>

                  {/* Sort toggle */}
                  <button
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="inline-flex items-center justify-between sm:justify-start gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/80 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-400" />
                      <span className="text-xs">
                        {sortOrder === 'desc' ? 'Latest First' : 'Oldest First'}
                      </span>
                    </div>
                    {sortOrder === 'desc' ? (
                      <ArrowDown className="w-3.5 h-3.5 text-white/60" />
                    ) : (
                      <ArrowUp className="w-3.5 h-3.5 text-white/60" />
                    )}
                  </button>
                </div>
              </div>

              {/* Advanced Filters Panel */}
              {showFiltersPanel && (
                <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] transition-all duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Column 1: Date Range */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-white/50 font-medium">Date Range</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/80 focus:outline-none focus:border-purple-500/50"
                        />
                        <span className="text-white/30 text-xs">to</span>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/80 focus:outline-none focus:border-purple-500/50"
                        />
                      </div>
                    </div>

                    {/* Column 2: Financial Status */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-white/50 font-medium">Financial Status</label>
                      <select
                        value={financialFilter}
                        onChange={(e) => setFinancialFilter(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/80 focus:outline-none focus:border-purple-500/50 [&>option]:bg-zinc-950 [&>option]:text-white"
                      >
                        <option value="all">All Financial Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="partially_paid">Partially Paid</option>
                        <option value="refunded">Refunded</option>
                        <option value="voided">Voided</option>
                      </select>
                    </div>

                    {/* Column 3: Fulfillment Status */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-white/50 font-medium">Fulfillment Status</label>
                      <select
                        value={fulfillmentFilter}
                        onChange={(e) => setFulfillmentFilter(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/80 focus:outline-none focus:border-purple-500/50 [&>option]:bg-zinc-950 [&>option]:text-white"
                      >
                        <option value="all">All Fulfillment Statuses</option>
                        <option value="unfulfilled">Unfulfilled</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="delivered">Delivered</option>
                        <option value="in_transit">In Transit</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="failure">Delivery Failed</option>
                        <option value="attempted_delivery">Attempted Delivery</option>
                      </select>
                    </div>

                    {/* Column 4: Total Price Range */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-white/50 font-medium">Order Total (INR)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={minPrice}
                          onChange={(e) => setMinPrice(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-purple-500/50"
                        />
                        <span className="text-white/30 text-xs">-</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-purple-500/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions row inside drawer */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                    <div className="text-xs text-white/40">
                      {activeFiltersCount > 0 ? (
                        <span>
                          Showing filtered orders (matching {filteredAndSortedOrders.length} of {orders.length})
                        </span>
                      ) : (
                        <span>Showing all orders. Use controls above to filter.</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {activeFiltersCount > 0 && (
                        <button
                          onClick={() => {
                            setFinancialFilter('all')
                            setFulfillmentFilter('all')
                            setMinPrice('')
                            setMaxPrice('')
                            setStartDate('')
                            setEndDate('')
                          }}
                          className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          Reset Filters
                        </button>
                      )}
                      <button
                        onClick={() => setShowFiltersPanel(false)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-medium text-white transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Close Drawer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-white/60 bg-white/5">
                      <th className="px-6 py-3 font-medium">Order</th>
                      <th className="px-6 py-3 font-medium">Customer</th>
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium">Financial</th>
                      <th className="px-6 py-3 font-medium">Fulfillment</th>
                      <th className="px-6 py-3 font-medium text-right">Total</th>
                      <th className="px-6 py-3 font-medium text-right">Shiprocket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-white/40">
                          <div className="flex flex-col items-center gap-2">
                            <Search className="w-6 h-6 text-white/20" />
                            <span className="text-sm font-medium">No matching orders found</span>
                            <span className="text-xs text-white/30">Try adjusting your search query</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedOrders.map((order) => {
                        const customerName =
                          order.customer &&
                          `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
                        return (
                          <tr
                            key={order.id}
                            className="border-t border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                            onClick={() => router.push(`/orders/${order.id}`)}
                          >
                            <td className="px-6 py-3 text-white">
                              <div className="flex flex-col">
                                <span className="font-medium text-purple-300 hover:text-purple-200">{order.name}</span>
                                <span className="text-xs text-white/50">ID: {order.id}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-white/80">
                              <div className="flex flex-col">
                                <span>{customerName || 'Guest'}</span>
                                {order.customer?.email && (
                                  <span className="text-xs text-white/50">{order.customer.email}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-white/80">
                              {new Date(order.created_at).toLocaleString()}
                            </td>
                            <td className="px-6 py-3">
                              <Badge label={order.financial_status || 'N/A'} variant={statusVariant(order.financial_status)} />
                            </td>
                            <td className="px-6 py-3">
                              {(() => {
                                const delInfo = getDeliveryStatusInfo(order);
                                return <Badge label={delInfo.label} variant={delInfo.variant} />;
                              })()}
                            </td>
                            <td className="px-6 py-3 text-right text-white">
                              {order.total_price} {order.currency}
                            </td>
                            <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleShiprocketAction('label', order) }}
                                  disabled={shiprocketLoadingOrderId === order.id}
                                  className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Print Label"
                                >
                                  <FileBadge2 className="w-3 h-3 mr-1" />
                                  Label
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleShiprocketAction('manifest', order) }}
                                  disabled={shiprocketLoadingOrderId === order.id}
                                  className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Print Manifest"
                                >
                                  <FileSpreadsheet className="w-3 h-3 mr-1" />
                                  Manifest
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleShiprocketAction('invoice', order) }}
                                  disabled={shiprocketLoadingOrderId === order.id}
                                  className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Print Invoice"
                                >
                                  <FileText className="w-3 h-3 mr-1" />
                                  Invoice
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

