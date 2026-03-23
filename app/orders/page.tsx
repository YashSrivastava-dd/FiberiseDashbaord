'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Loader2, RefreshCw, ShoppingBag, AlertCircle, FileText, FileSpreadsheet, FileBadge2 } from 'lucide-react'

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
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<ShopifyOrder[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [shiprocketLoadingOrderId, setShiprocketLoadingOrderId] = useState<number | null>(null)
  const [shiprocketError, setShiprocketError] = useState<string | null>(null)

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
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <p className="text-white font-semibold text-sm">
                  Orders <span className="text-white/50 font-normal">({orders.length})</span>
                </p>
              </div>

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
                    {orders.map((order) => {
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
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-white/5 text-white/80">
                              {order.financial_status || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-white/5 text-white/80">
                              {order.fulfillment_status || 'Unfulfilled'}
                            </span>
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
                    })}
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

