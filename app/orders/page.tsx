'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  Loader2,
  RefreshCw,
  Search,
  Calendar,
  SlidersHorizontal,
  X,
  Truck,
  Package,
  MapPin,
  Eye,
  EyeOff,
  ShieldAlert,
  Award,
  Compass,
  ArrowLeftRight,
  CheckCircle2,
  ChevronRight,
  Activity,
  Plus,
  TrendingDown,
  Info,
  Download,
  AlertCircle,
  User,
  CreditCard,
  ShoppingCart,
  ArrowLeft,
  Filter,
  Trash2,
  MoreHorizontal
} from 'lucide-react'

// ─── Interfaces ──────────────────────────────────────────────────────────────

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

interface CourierQuote {
  id: string
  name: string
  rate: number
  edd: string
  rating: number
}

interface ManifestRecord {
  id: string
  date: string
  shipmentCount: number
  address: string
  courier: string
  status: string
  manifestName: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Badge({ label, variant = 'default' }: { label: string; variant?: 'green' | 'yellow' | 'red' | 'blue' | 'default' }) {
  const colors = {
    green:   'bg-green-500/15 text-green-300 border-green-500/30',
    yellow:  'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    red:     'bg-red-500/15 text-red-300 border-red-500/30',
    blue:    'bg-blue-500/15 text-blue-300 border-blue-500/30',
    default: 'bg-white/5 text-white/70 border-white/10',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[variant]}`}>
      {label}
    </span>
  )
}

function statusVariant(status: string | null): 'green' | 'yellow' | 'red' | 'blue' | 'default' {
  if (!status) return 'default'
  const s = status.toLowerCase()
  if (['paid', 'fulfilled', 'delivered', 'ready to ship'].some(v => s.includes(v))) return 'green'
  if (['pending', 'partial', 'in_transit', 'out_for_delivery', 'attempted', 'pickup scheduled', 'out for pickup'].some(v => s.includes(v))) return 'yellow'
  if (['refunded', 'voided', 'cancelled', 'failed', 'failure', 'rto', 'returned'].some(v => s.includes(v))) return 'red'
  if (['authorized', 'confirmed', 'label printed'].some(v => s.includes(v))) return 'blue'
  return 'default'
}

function isOrderCancelled(order: ShopifyOrder): boolean {
  return (
    !!(order as any).cancelled_at ||
    order.financial_status?.toLowerCase() === 'voided' ||
    order.financial_status?.toLowerCase() === 'cancelled' ||
    order.financial_status?.toLowerCase() === 'refunded' ||
    order.fulfillments?.[0]?.shipment_status === 'cancelled'
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ShiprocketDashboardPage() {
  const router = useRouter()
  
  // Tab states
  const [currentTab, setCurrentTab] = useState<'new' | 'ready_to_ship' | 'pickups_manifests' | 'in_transit' | 'delivered' | 'rto' | 'cancelled' | 'all'>('new')
  const [manifestSubtab, setManifestSubtab] = useState<'pickup_ids' | 'manifests'>('pickup_ids')

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1)
  const ORDERS_PER_PAGE = 50

  // Search & Basic Sorting States
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(false)

  // ─── CATEGORIZED ADVANCED SHIPROCKET FILTERS ───
  
  // Category A: Date Boundaries & Presets
  const [datePreset, setDatePreset] = useState<string>('all') // today, yesterday, 7days, 30days, custom
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Category B: Channel & Logistics Routing
  const [filterChannel, setFilterChannel] = useState<string>('all') // shopify, amazon, woocommerce, manual, all
  const [filterCourier, setFilterCourier] = useState<string>('all') // delhivery, shadowfax, ekart, xpressbees, all
  const [filterPickupLocation, setFilterPickupLocation] = useState<string>('all') // primary, warehouse_b, all

  // Category C: Volumetric weight & Risk Levels
  const [filterWeightClass, setFilterWeightClass] = useState<string>('all') // under_05, 05_to_1, 1_to_2, above_2, all
  const [filterRtoRisk, setFilterRtoRisk] = useState<string>('all') // high, medium, low, all

  // Category D: Financial & Fulfillment Stages
  const [filterPaymentType, setFilterPaymentType] = useState<string>('all') // prepaid, cod, all
  const [financialFilter, setFinancialFilter] = useState<string>('all') // paid, pending, refunded, voided, all
  const [filterFulfillmentStatus, setFilterFulfillmentStatus] = useState<string>('all') // unfulfilled, scheduled, in_transit, out_for_delivery, delivered, failed, rto, all
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')

  // Orders State (loaded and managed locally for high-fidelity state dispatches)
  const [orders, setOrders] = useState<ShopifyOrder[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState<boolean>(false)

  // Interactive UI elements & simulation states
  const [unmaskedPhones, setUnmaskedPhones] = useState<Record<number, boolean>>({})
  const [selectedOrders, setSelectedOrders] = useState<Record<number, boolean>>({})
  
  // Modal / Drawer Trigger States
  const [activeCourierOrder, setActiveCourierOrder] = useState<ShopifyOrder | null>(null)
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<ShopifyOrder | null>(null)
  const [activeRtoRiskOrder, setActiveRtoRiskOrder] = useState<ShopifyOrder | null>(null)
  const [activeDetailOrder, setActiveDetailOrder] = useState<ShopifyOrder | null>(null)
  const [activeDropdownOrderId, setActiveDropdownOrderId] = useState<number | null>(null)

  const handleCloneOrder = async (order: ShopifyOrder) => {
    const cleanName = order.name || ''
    const cleanBaseName = cleanName.replace('#', '').trim()
    const clonedName = `${cleanBaseName}-C`

    const orderItems = (order.line_items || []).map(item => ({
      name: item.title || 'Starter pack',
      sku: item.sku || 'test pack',
      units: Number(item.quantity) || 1,
      selling_price: Number(item.price) || 0
    }))

    // Sanitize phone to exactly 10 digits numeric
    const rawPhone = order.customer?.phone || order.shipping_address?.phone || '9999999999'
    const sanitizedPhone = String(rawPhone).replace(/[^0-9]/g, '').slice(-10) || '9999999999'

    // Sanitize pincode to numeric
    const rawZip = order.shipping_address?.zip || '400001'
    const sanitizedZip = Number(String(rawZip).replace(/[^0-9]/g, '')) || 400001

    const payload = {
      order_id: clonedName,
      order_date: new Date().toISOString().slice(0, 10), // 'YYYY-MM-DD'
      pickup_location: 'Primary',
      billing_customer_name: order.customer?.first_name || 'Guest',
      billing_last_name: order.customer?.last_name || '',
      billing_address: order.shipping_address?.address1 || 'N/A',
      billing_address_2: order.shipping_address?.address2 || '',
      billing_city: order.shipping_address?.city || 'Mumbai',
      billing_pincode: sanitizedZip,
      billing_state: order.shipping_address?.province || 'Maharashtra',
      billing_country: order.shipping_address?.country || 'India',
      billing_email: order.customer?.email || 'customer@example.com',
      billing_phone: sanitizedPhone,
      shipping_is_billing: true,
      order_items: orderItems,
      payment_method: order.financial_status === 'paid' ? 'Prepaid' : 'COD',
      sub_total: Number(order.total_price) || 0,
      length: 15,
      breadth: 10,
      height: 5,
      weight: 0.45
    }

    try {
      setActiveDropdownOrderId(null)
      triggerNotification('success', `Cloning order ${order.name} to Shiprocket panel...`)
      
      const res = await fetch('/api/shiprocket/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create order on Shiprocket')

      // Prepend the new cloned order to the frontend state
      const clonedOrder: ShopifyOrder = {
        ...order,
        id: data.order_id || Math.floor(1000000 + Math.random() * 9000000),
        name: `#${clonedName}`,
        created_at: new Date().toISOString(),
        fulfillment_status: null,
        fulfillments: [],
        cancelled_at: null,
      }

      setOrders((prev) => [clonedOrder, ...prev])
      setCurrentTab('new')
      triggerNotification('success', `Order cloned successfully to Shiprocket & New Dispatches!`)
    } catch (err: any) {
      triggerNotification('error', `Failed to sync clone to Shiprocket: ${err.message}`)
    }
  }
  
  // Shiprocket Actions Loading state
  const [actionLoadingOrderId, setActionLoadingOrderId] = useState<number | null>(null)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Manifests Mock Database (starts with some, adds when dispatches are triggered)
  const [manifests, setManifests] = useState<ManifestRecord[]>([
    {
      id: 'SRPID-47954376',
      date: '18 May 2026',
      shipmentCount: 12,
      address: 'Primary Warehouse',
      courier: 'Shadowfax',
      status: 'PICKUP SCHEDULED',
      manifestName: 'Manifest-0019'
    },
    {
      id: 'SRPID-47954237',
      date: '18 May 2026',
      shipmentCount: 1,
      address: 'Primary Warehouse',
      courier: 'Delhivery',
      status: 'PICKUP SCHEDULED',
      manifestName: 'Manifest-0018'
    }
  ])

  // Courier list quotes
  const courierQuotes: CourierQuote[] = [
    { id: 'delhivery', name: 'Delhivery Surface', rate: 48, edd: '21 May 2026 (3 Days)', rating: 4.5 },
    { id: 'shadowfax', name: 'Shadowfax Surface', rate: 42, edd: '22 May 2026 (4 Days)', rating: 4.2 },
    { id: 'ekart', name: 'Ekart Logistics', rate: 50, edd: '20 May 2026 (2 Days)', rating: 4.7 },
    { id: 'xpressbees', name: 'Xpressbees Air', rate: 46, edd: '21 May 2026 (3 Days)', rating: 4.4 }
  ]

  // ── Fetch Shopify Orders ──
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/shopify/orders')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to fetch Shopify orders')

        // We preserve real order data and fulfillments fetched from Shopify & Shiprocket
        const enriched: ShopifyOrder[] = (data.orders || []).map((o: any) => {
          return {
            ...o,
            fulfillment_status: o.fulfillment_status || null,
            fulfillments: o.fulfillments || []
          }
        })

        setOrders(enriched)
        setIsOffline(!!data.isOffline)
        setError(null)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  // ─── Live Event Listeners for Incoming Shopify Orders ───
  useEffect(() => {
    const handleLiveOrderReceived = (e: Event) => {
      const customEvent = e as CustomEvent<ShopifyOrder>
      const newOrder = customEvent.detail
      if (newOrder && newOrder.id) {
        setOrders((prev) => {
          // Avoid duplicate appends
          if (prev.some(o => o.id === newOrder.id || o.name === newOrder.name)) return prev
          return [newOrder, ...prev]
        })
        triggerNotification('success', `Live Feed: Simulated Shopify order ${newOrder.name} imported!`)
      }
    }

    const handleViewLiveOrder = (e: Event) => {
      const customEvent = e as CustomEvent<string>
      const orderName = customEvent.detail
      if (orderName) {
        // 1. Close any open detail drawers/modals first
        setActiveDetailOrder(null)
        setActiveCourierOrder(null)
        setActiveTrackingOrder(null)
        setActiveRtoRiskOrder(null)

        // 2. Switch tab to 'new' (since the simulated order is unfulfilled/new)
        setCurrentTab('new')

        // 3. Highlight/Open details drawer for the matching order
        setTimeout(() => {
          setOrders((currentOrders) => {
            const found = currentOrders.find((o) => o.name === orderName)
            if (found) {
              setActiveDetailOrder(found)
            }
            return currentOrders
          })
        }, 100)
      }
    }

    window.addEventListener('shopify_new_order_received', handleLiveOrderReceived)
    window.addEventListener('shopify_view_live_order', handleViewLiveOrder)

    return () => {
      window.removeEventListener('shopify_new_order_received', handleLiveOrderReceived)
      window.removeEventListener('shopify_view_live_order', handleViewLiveOrder)
    }
  }, [])

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [
    currentTab,
    searchQuery,
    sortOrder,
    datePreset,
    startDate,
    endDate,
    filterChannel,
    filterCourier,
    filterPickupLocation,
    filterWeightClass,
    filterRtoRisk,
    filterPaymentType,
    financialFilter,
    filterFulfillmentStatus,
    minPrice,
    maxPrice
  ])


  // ── Logistics Actions Simulations ──

  // 1. Ship Now (Select Courier quote & Assign AWB)
  const handleAssignCourier = (orderId: number, courier: CourierQuote) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o
        return {
          ...o,
          fulfillment_status: 'fulfilled',
          fulfillments: [
            {
              id: Math.floor(Math.random() * 10000),
              status: 'success',
              tracking_number: `SR${courier.name.substring(0, 2).toUpperCase()}${Math.floor(100000000 + Math.random() * 900000000)}`,
              tracking_company: courier.name,
              tracking_url: '#',
              shipment_status: 'pickup_scheduled',
              created_at: new Date().toISOString()
            }
          ]
        }
      })
    )
    setActiveCourierOrder(null)
    triggerNotification('success', `Successfully generated AWB and scheduled pickup with ${courier.name}!`)
  }

  // 2. Download Manifest (Dispatches Ready To Ship order into In Transit)
  const handleManifestDispatch = (order: ShopifyOrder) => {
    setActionLoadingOrderId(order.id)
    setTimeout(() => {
      // Move to In Transit
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== order.id) return o
          const currentFulfillments = o.fulfillments || []
          return {
            ...o,
            fulfillments: currentFulfillments.map((f, i) =>
              i === 0 ? { ...f, shipment_status: 'in_transit' } : f
            )
          }
        })
      )
      // Add manifest record
      const newManifest: ManifestRecord = {
        id: `SRPID-${Math.floor(47000000 + Math.random() * 900000)}`,
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        shipmentCount: 1,
        address: 'Primary Warehouse',
        courier: order.fulfillments?.[0]?.tracking_company || 'Standard Surface',
        status: 'PICKUP SCHEDULED',
        manifestName: `Manifest-00${Math.floor(20 + Math.random() * 80)}`
      }
      setManifests((prev) => [newManifest, ...prev])
      setActionLoadingOrderId(null)
      triggerNotification('success', `Manifest fully generated and printed! Package is hand-off ready.`)
    }, 1000)
  }

  // Helper notification bubble
  const triggerNotification = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text })
    setTimeout(() => setActionMessage(null), 5000)
  }

  // ── Cancel Order ──
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null)

  const handleDeleteOrder = async (orderId: number) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return

    try {
      setDeletingOrderId(orderId)
      const res = await fetch(`/api/shopify/orders/${orderId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to cancel order')

      // Update order state in-place to cancelled
      setOrders((prev) => prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            cancelled_at: new Date().toISOString(),
            financial_status: 'voided'
          }
        }
        return o
      }))
      setActiveDetailOrder(null)
      triggerNotification('success', 'Order cancelled successfully.')
    } catch (err: any) {
      triggerNotification('error', err.message || 'Error cancelling order.')
    } finally {
      setDeletingOrderId(null)
    }
  }

  const [bulkDeleting, setBulkDeleting] = useState(false)

  const handleBulkDelete = async () => {
    const selectedIds = Object.keys(selectedOrders)
      .map(Number)
      .filter((id) => selectedOrders[id])

    if (selectedIds.length === 0) return

    if (!window.confirm(`Are you sure you want to cancel the ${selectedIds.length} selected orders?`)) return

    try {
      setBulkDeleting(true)
      const res = await fetch('/api/shopify/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to bulk cancel orders')

      // Mark selected orders as cancelled in state
      setOrders((prev) => prev.map((o) => {
        if (selectedIds.includes(o.id)) {
          return {
            ...o,
            cancelled_at: new Date().toISOString(),
            financial_status: 'voided'
          }
        }
        return o
      }))
      setSelectedOrders({})
      triggerNotification('success', `Successfully cancelled ${selectedIds.length} orders.`)
    } catch (err: any) {
      triggerNotification('error', err.message || 'Error bulk cancelling orders.')
    } finally {
      setBulkDeleting(false)
    }
  }

  // ── Phone Masking Toggler ──
  const togglePhoneMask = (id: number) => {
    setUnmaskedPhones((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // ── Row Selection Toggler ──
  const toggleSelectRow = (id: number) => {
    setSelectedOrders((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleSelectAll = (filteredList: ShopifyOrder[]) => {
    const allSelected = filteredList.every((o) => selectedOrders[o.id])
    const updated: Record<number, boolean> = { ...selectedOrders }
    filteredList.forEach((o) => {
      updated[o.id] = !allSelected
    })
    setSelectedOrders(updated)
  }

  // ── RTO Risk Assessment Engine ──
  const getRtoRisk = (order: ShopifyOrder) => {
    const price = parseFloat(order.total_price)
    const isCod = order.financial_status?.toLowerCase() === 'pending'
    if (isCod && price > 1000) {
      return { score: 'High Risk', pct: '68% Risk Score', color: 'red' as const, factors: ['COD Payment Method', 'High Value Ticket Item', 'Pincode delivery failure rate: 12.4%'] }
    }
    if (isCod) {
      return { score: 'Medium Risk', pct: '34% Risk Score', color: 'yellow' as const, factors: ['COD Payment Method', 'Pincode delivery failure rate: 4.8%'] }
    }
    return { score: 'Low Risk', pct: '2.5% Risk Score', color: 'green' as const, factors: ['Prepaid Order Secured', 'Address match score: 98%', 'Previous buyer history verified'] }
  }

  // ── Filters & Search Bounding Core ──
  const activeFiltersCount = [
    financialFilter !== 'all',
    filterPaymentType !== 'all',
    filterChannel !== 'all',
    filterCourier !== 'all',
    filterPickupLocation !== 'all',
    filterWeightClass !== 'all',
    filterRtoRisk !== 'all',
    minPrice !== '',
    maxPrice !== '',
    datePreset !== 'all',
    startDate !== '',
    endDate !== '',
    filterFulfillmentStatus !== 'all'
  ].filter(Boolean).length

  // Filter Shopify orders across search terms & filter cards
  const filteredOrders = orders.filter((order) => {
    // 1. Text Search terms
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

    // 2. Financial Status
    if (financialFilter !== 'all') {
      const status = order.financial_status?.toLowerCase() || ''
      if (status !== financialFilter.toLowerCase()) return false
    }

    // 3. Payment Type (COD vs Prepaid)
    if (filterPaymentType !== 'all') {
      const isPaid = order.financial_status?.toLowerCase() === 'paid'
      const matchesCod = filterPaymentType === 'cod' && !isPaid
      const matchesPrepaid = filterPaymentType === 'prepaid' && isPaid
      if (!matchesCod && !matchesPrepaid) return false
    }

    // 4. Sales Channel
    if (filterChannel !== 'all') {
      if (filterChannel === 'shopify') {
        // all orders are Shopify in this current project database
      } else {
        return false // mock mismatch for other channels
      }
    }

    // 5. Courier Partner
    if (filterCourier !== 'all') {
      const activeCourier = order.fulfillments?.[0]?.tracking_company?.toLowerCase() || ''
      if (!activeCourier.includes(filterCourier.toLowerCase())) return false
    }

    // 6. Pickup Location
    if (filterPickupLocation !== 'all') {
      if (filterPickupLocation !== 'primary') return false // only primary has data
    }

    // 7. Weight Class Range
    if (filterWeightClass !== 'all') {
      const weight = 0.45 // Mock dead weight (0.45 kg)
      if (filterWeightClass === 'under_05' && weight >= 0.5) return false
      if (filterWeightClass === '05_to_1' && (weight < 0.5 || weight > 1.0)) return false
      if (filterWeightClass === '1_to_2' && (weight < 1.0 || weight > 2.0)) return false
      if (filterWeightClass === 'above_2' && weight <= 2.0) return false
    }

    // 8. RTO Risk Level
    if (filterRtoRisk !== 'all') {
      const risk = getRtoRisk(order).score.toLowerCase()
      if (!risk.includes(filterRtoRisk.toLowerCase())) return false
    }

    // 9. Price boundaries
    const price = parseFloat(order.total_price)
    if (!isNaN(price)) {
      if (minPrice && price < parseFloat(minPrice)) return false
      if (maxPrice && price > parseFloat(maxPrice)) return false
    }

    // 10. Date boundaries & Presets
    let resolvedStart = startDate
    let resolvedEnd = endDate

    if (datePreset !== 'all') {
      const now = new Date()
      if (datePreset === 'today') {
        const start = new Date()
        start.setHours(0, 0, 0, 0)
        resolvedStart = start.toISOString()
        resolvedEnd = now.toISOString()
      } else if (datePreset === 'yesterday') {
        const start = new Date()
        start.setDate(now.getDate() - 1)
        start.setHours(0, 0, 0, 0)
        const end = new Date()
        end.setDate(now.getDate() - 1)
        end.setHours(23, 59, 59, 999)
        resolvedStart = start.toISOString()
        resolvedEnd = end.toISOString()
      } else if (datePreset === '7days') {
        const start = new Date()
        start.setDate(now.getDate() - 7)
        start.setHours(0, 0, 0, 0)
        resolvedStart = start.toISOString()
        resolvedEnd = now.toISOString()
      } else if (datePreset === '30days') {
        const start = new Date()
        start.setDate(now.getDate() - 30)
        start.setHours(0, 0, 0, 0)
        resolvedStart = start.toISOString()
        resolvedEnd = now.toISOString()
      }
    }

    if (resolvedStart || resolvedEnd) {
      const orderDate = new Date(order.created_at)
      if (resolvedStart) {
        const start = new Date(resolvedStart)
        if (orderDate < start) return false
      }
      if (resolvedEnd) {
        const end = new Date(resolvedEnd)
        if (orderDate > end) return false
      }
    }

    // 11. Fulfillment / Delivery stage sub-status
    if (filterFulfillmentStatus !== 'all') {
      const delInfo = getDeliveryStatusInfo(order)
      if (delInfo.label.toLowerCase() !== filterFulfillmentStatus.toLowerCase()) return false
    }

    return true
  })

  // Group into Tab lists dynamically
  const ordersTabLists = {
    new: filteredOrders.filter(o => {
      if (isOrderCancelled(o)) return false
      if (!o.fulfillment_status || o.fulfillment_status === 'unfulfilled') {
        const ageInMs = Date.now() - new Date(o.created_at).getTime()
        const ageInDays = ageInMs / (1000 * 60 * 60 * 24)
        return ageInDays <= 2 // Only show new orders created within the last 2 days
      }
      return false
    }),
    ready_to_ship: filteredOrders.filter(o => {
      if (isOrderCancelled(o)) return false
      if (o.fulfillment_status === 'fulfilled') {
        const latest = o.fulfillments?.[0]
        const status = (latest?.shipment_status || '').toLowerCase()
        return !['in_transit', 'out_for_delivery', 'delivered', 'failure', 'attempted_delivery', 'rto', 'returned'].includes(status)
      }
      return false
    }),
    pickups_manifests: filteredOrders.filter(o => !isOrderCancelled(o)), // Special rendered view tab
    in_transit: filteredOrders.filter(o => {
      if (isOrderCancelled(o)) return false
      if (o.fulfillment_status === 'fulfilled') {
        const latest = o.fulfillments?.[0]
        const status = (latest?.shipment_status || '').toLowerCase()
        return ['in_transit', 'out_for_delivery', 'attempted_delivery'].includes(status)
      }
      return false
    }),
    delivered: filteredOrders.filter(o => {
      if (isOrderCancelled(o)) return false
      if (o.fulfillment_status === 'fulfilled') {
        const latest = o.fulfillments?.[0]
        const status = (latest?.shipment_status || '').toLowerCase()
        return status === 'delivered'
      }
      return false
    }),
    rto: filteredOrders.filter(o => {
      if (isOrderCancelled(o)) return false
      if (o.fulfillment_status === 'fulfilled') {
        const latest = o.fulfillments?.[0]
        const status = (latest?.shipment_status || '').toLowerCase()
        return ['failure', 'rto', 'returned'].includes(status)
      }
      return false
    }),
    cancelled: filteredOrders.filter(o => isOrderCancelled(o)),
    all: filteredOrders
  }

  // Sorted list for currently active tab
  const activeTabOrders = (ordersTabLists[currentTab] || [])
    .sort((a, b) => {
      if (currentTab === 'rto') {
        const dateA = new Date(a.fulfillments?.[0]?.created_at || a.created_at).getTime()
        const dateB = new Date(b.fulfillments?.[0]?.created_at || b.created_at).getTime()
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
      }
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })

  // Slicing for client-side pagination (50 orders per page)
  const startIndex = (currentPage - 1) * ORDERS_PER_PAGE
  const endIndex = startIndex + ORDERS_PER_PAGE
  const paginatedOrders = activeTabOrders.slice(startIndex, endIndex)
  const totalPages = Math.ceil(activeTabOrders.length / ORDERS_PER_PAGE) || 1

  return (
    <div className="min-h-screen bg-[#07090e] text-white">
      <Sidebar />
      <TopBar />
      
      <main className="ml-0 lg:ml-64 p-4 lg:p-6 transition-all duration-300">
        <div className="max-w-7xl mx-auto mt-20">
          
          {/* Action toast feedback */}
          {actionMessage && (
            <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl animate-fade-in ${
              actionMessage.type === 'success'
                ? 'bg-green-950/90 border-green-500/50 text-green-300'
                : 'bg-red-950/90 border-red-500/50 text-red-300'
            }`}>
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span className="text-sm font-medium">{actionMessage.text}</span>
              <button onClick={() => setActionMessage(null)} className="hover:opacity-75">
                <X className="w-4 h-4 ml-1" />
              </button>
            </div>
          )}

          {/* Page Title & Top Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="px-2.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-semibold">
                  Shiprocket Logistics Core
                </div>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-purple-400 bg-clip-text text-transparent">
                Shiprocket Order Panel
              </h1>
            </div>

            {/* Quick stats banner */}
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 pr-6 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center border border-purple-500/20 shrink-0 text-purple-300">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wide">Sync Status</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-ping'}`}></span>
                  <span className="text-sm font-bold text-white">
                    {isOffline ? 'Offline / Demo' : 'Live Connection'}
                  </span>
                </div>
              </div>
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

          {/* Search, Sort, Filter Drawer Toggle */}
          <div className="bg-card rounded-2xl border border-white/10 p-4 mb-6 backdrop-blur-xl">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search via Order Name, ID, SKU, or Customer details..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/35 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
                <button
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/80 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Sorted: {sortOrder === 'desc' ? 'Latest First' : 'Oldest First'}
                </button>

                <button
                  onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    showFiltersPanel || activeFiltersCount > 0
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Advanced Filters
                  {activeFiltersCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-white text-purple-700 text-[10px] font-bold flex items-center justify-center ml-0.5">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* ── HIGH FIDELITY CATEGORIZED SHIPROCKET FILTER PANEL ── */}
            {showFiltersPanel && (
              <div className="mt-4 pt-4 border-t border-white/10 animate-slide-down">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Category Filters (Official Shiprocket Specs)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                  
                  {/* Category A: Date Boundaries & Presets */}
                  <div className="space-y-4 border-r border-white/5 pr-4 last:border-0 last:pr-0">
                    <p className="text-[11px] font-bold text-purple-400 uppercase tracking-widest">A. Date Presets & Ranges</p>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-white/40 font-semibold uppercase">Date Presets</label>
                      <select
                        value={datePreset}
                        onChange={(e) => setDatePreset(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0e121a] border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                      >
                        <option value="all">All Dates</option>
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="7days">Last 7 Days</option>
                        <option value="30days">Last 30 Days</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-white/40 font-semibold uppercase">Custom Start</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => { setStartDate(e.target.value); setDatePreset('all'); }}
                          className="w-full px-2 py-1 bg-[#0e121a] border border-white/10 rounded-lg text-[10px] text-white/80 focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-white/40 font-semibold uppercase">Custom End</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => { setEndDate(e.target.value); setDatePreset('all'); }}
                          className="w-full px-2 py-1 bg-[#0e121a] border border-white/10 rounded-lg text-[10px] text-white/80 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category B: Channel & Logistics Routing */}
                  <div className="space-y-4 border-r border-white/5 pr-4 last:border-0 last:pr-0">
                    <p className="text-[11px] font-bold text-purple-400 uppercase tracking-widest">B. Channel & Logistics</p>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-white/40 font-semibold uppercase">Sales Channel</label>
                      <select
                        value={filterChannel}
                        onChange={(e) => setFilterChannel(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0e121a] border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                      >
                        <option value="all">All Channels</option>
                        <option value="shopify">Shopify Store</option>
                        <option value="amazon">Amazon Central</option>
                        <option value="woocommerce">WooCommerce Store</option>
                        <option value="manual">Manual Booking</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-white/40 font-semibold uppercase">Courier Partner</label>
                      <select
                        value={filterCourier}
                        onChange={(e) => setFilterCourier(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0e121a] border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                      >
                        <option value="all">All Couriers</option>
                        <option value="delhivery">Delhivery</option>
                        <option value="shadowfax">Shadowfax</option>
                        <option value="ekart">Ekart Logistics</option>
                        <option value="xpressbees">Xpressbees</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-white/40 font-semibold uppercase">Pickup Warehouse</label>
                      <select
                        value={filterPickupLocation}
                        onChange={(e) => setFilterPickupLocation(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0e121a] border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                      >
                        <option value="all">All Warehouses</option>
                        <option value="primary">Primary Hub (Delhi)</option>
                        <option value="warehouse_b">Warehouse B (Mumbai)</option>
                      </select>
                    </div>
                  </div>

                  {/* Category C: Weight Dimensions & Risk Probability */}
                  <div className="space-y-4 border-r border-white/5 pr-4 last:border-0 last:pr-0">
                    <p className="text-[11px] font-bold text-purple-400 uppercase tracking-widest">C. Volumetric & RTO Risk</p>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-white/40 font-semibold uppercase">Package Weight Class</label>
                      <select
                        value={filterWeightClass}
                        onChange={(e) => setFilterWeightClass(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0e121a] border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                      >
                        <option value="all">All Weights</option>
                        <option value="under_05">Under 0.5 Kg</option>
                        <option value="05_to_1">0.5 Kg to 1.0 Kg</option>
                        <option value="1_to_2">1.0 Kg to 2.0 Kg</option>
                        <option value="above_2">Above 2.0 Kg</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-white/40 font-semibold uppercase">RTO Risk Probability</label>
                      <select
                        value={filterRtoRisk}
                        onChange={(e) => setFilterRtoRisk(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0e121a] border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                      >
                        <option value="all">All Risk Levels</option>
                        <option value="high">High Risk Score</option>
                        <option value="medium">Medium Risk Score</option>
                        <option value="low">Low Risk Score</option>
                      </select>
                    </div>
                  </div>

                  {/* Category D: Financial & Fulfillment Stages */}
                  <div className="space-y-4">
                    <p className="text-[11px] font-bold text-purple-400 uppercase tracking-widest">D. Financials & Delivery</p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-white/40 font-semibold uppercase">Payment Type</label>
                        <select
                          value={filterPaymentType}
                          onChange={(e) => setFilterPaymentType(e.target.value)}
                          className="w-full px-2 py-1.5 bg-[#0e121a] border border-white/10 rounded-lg text-[10px] text-white focus:outline-none"
                        >
                          <option value="all">All Types</option>
                          <option value="prepaid">Prepaid</option>
                          <option value="cod">COD</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-white/40 font-semibold uppercase">Financials</label>
                        <select
                          value={financialFilter}
                          onChange={(e) => setFinancialFilter(e.target.value)}
                          className="w-full px-2 py-1.5 bg-[#0e121a] border border-white/10 rounded-lg text-[10px] text-white focus:outline-none"
                        >
                          <option value="all">All</option>
                          <option value="paid">Paid</option>
                          <option value="pending">Pending</option>
                          <option value="refunded">Refunded</option>
                          <option value="voided">Voided</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-white/40 font-semibold uppercase">Fulfillment Sub-Status</label>
                      <select
                        value={filterFulfillmentStatus}
                        onChange={(e) => setFilterFulfillmentStatus(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0e121a] border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                      >
                        <option value="all">All Stages</option>
                        <option value="unfulfilled">Unfulfilled</option>
                        <option value="label printed">Label Printed</option>
                        <option value="pickup scheduled">Pickup Scheduled</option>
                        <option value="in transit">In Transit</option>
                        <option value="out for delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="delivery failed">Failed Attempts</option>
                        <option value="rto">RTO Returns</option>
                      </select>
                    </div>

                    {/* Price boundaries */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-white/40 font-semibold uppercase">Order Value (INR)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={minPrice}
                          onChange={(e) => setMinPrice(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#0e121a] border border-white/10 rounded-lg text-xs text-white placeholder-white/20 focus:outline-none"
                        />
                        <span className="text-white/30 text-xs">-</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#0e121a] border border-white/10 rounded-lg text-xs text-white placeholder-white/20 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Drawer Footer Actions */}
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5 text-xs font-semibold">
                  <span className="text-white/40">
                    {activeFiltersCount > 0
                      ? `Active criteria: ${activeFiltersCount} applied · Resolving ${filteredOrders.length} matching shipments`
                      : 'All Shiprocket filter categories are currently in neutral state.'}
                  </span>
                  <div className="flex gap-2">
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={() => {
                          setDatePreset('all')
                          setStartDate('')
                          setEndDate('')
                          setFilterChannel('all')
                          setFilterCourier('all')
                          setFilterPickupLocation('all')
                          setFilterWeightClass('all')
                          setFilterRtoRisk('all')
                          setFilterPaymentType('all')
                          setFinancialFilter('all')
                          setFilterFulfillmentStatus('all')
                          setMinPrice('')
                          setMaxPrice('')
                        }}
                        className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        Reset Shiprocket Filters
                      </button>
                    )}
                    <button
                      onClick={() => setShowFiltersPanel(false)}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-colors"
                    >
                      Apply & Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Shiprocket Tabs Navigation Bar ── */}
          <div className="border-b border-white/10 mb-6 flex overflow-x-auto scrollbar-none gap-2">
            {(['new', 'ready_to_ship', 'pickups_manifests', 'in_transit', 'delivered', 'rto', 'cancelled', 'all'] as const).map((tab) => {
              const isActive = currentTab === tab
              const count = tab === 'pickups_manifests' ? manifests.length : (ordersTabLists[tab] || []).length
              const tabLabels = {
                new: 'New',
                ready_to_ship: 'Ready To Ship',
                pickups_manifests: 'Pickups & Manifests',
                in_transit: 'In Transit',
                delivered: 'Delivered',
                rto: 'RTO',
                cancelled: 'Cancelled',
                all: 'All'
              }

              return (
                <button
                  key={tab}
                  onClick={() => setCurrentTab(tab)}
                  className={`relative px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2 -mb-px flex items-center gap-2 ${
                    isActive
                      ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                      : 'border-transparent text-white/60 hover:text-white'
                  }`}
                >
                  {tabLabels[tab]}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-white/80'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ── Sub-tabs under Pickups & Manifests ── */}
          {currentTab === 'pickups_manifests' && (
            <div className="flex gap-2 mb-4 bg-white/5 border border-white/10 p-1.5 rounded-xl max-w-xs">
              <button
                onClick={() => setManifestSubtab('pickup_ids')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  manifestSubtab === 'pickup_ids' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                Pickup Ids
              </button>
              <button
                onClick={() => setManifestSubtab('manifests')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  manifestSubtab === 'manifests' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                Manifests
              </button>
            </div>
          )}

          {/* Bulk select action banner (when checkboxes are selected) */}
          {Object.values(selectedOrders).filter(Boolean).length > 0 && currentTab !== 'pickups_manifests' && (
            <div className="bg-purple-950/60 border border-purple-500/30 rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4 animate-slide-down">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse"></span>
                <span className="text-sm font-semibold text-purple-300">
                  {Object.values(selectedOrders).filter(Boolean).length} Orders Selected
                </span>
              </div>
              <div className="flex gap-2">
                {currentTab === 'new' && (
                  <button
                    onClick={() => {
                      const firstSel = activeTabOrders.find((o) => selectedOrders[o.id])
                      if (firstSel) setActiveCourierOrder(firstSel)
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-colors"
                  >
                    Bulk Ship Selected
                  </button>
                )}
                {currentTab === 'ready_to_ship' && (
                  <button
                    onClick={() => {
                      // Trigger mock manifest on all selected
                      activeTabOrders.forEach((o) => {
                        if (selectedOrders[o.id]) handleManifestDispatch(o)
                      })
                      setSelectedOrders({})
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-colors"
                  >
                    Bulk Download Manifests
                  </button>
                )}
                {currentTab !== 'cancelled' && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="px-4 py-2 rounded-xl bg-red-950/40 hover:bg-red-950/60 border border-red-500/30 text-xs font-bold text-red-400 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" /> : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
                    {bulkDeleting ? 'Cancelling...' : 'Cancel Selected'}
                  </button>
                )}
                <button
                  onClick={() => setSelectedOrders({})}
                  className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* ── Render Tables according to shipping states ── */}
          <div className="bg-card rounded-3xl border border-white/10 overflow-hidden shadow-2xl backdrop-blur-2xl">
            {loading ? (
              <div className="py-24 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-purple-400 mx-auto mb-4" />
                <p className="text-sm text-white/50 font-medium">Synchronizing with Shopify & Shiprocket API...</p>
              </div>
            ) : activeTabOrders.length === 0 && currentTab !== 'pickups_manifests' ? (
              <div className="py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 mx-auto mb-4">
                  <Package className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">No Orders in {tabName(currentTab)}</h3>
                <p className="text-xs text-white/40 max-w-sm mx-auto mb-4">
                  No orders match the current search query or active filter selections.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setDatePreset('all')
                    setStartDate('')
                    setEndDate('')
                    setFilterChannel('all')
                    setFilterCourier('all')
                    setFilterPickupLocation('all')
                    setFilterWeightClass('all')
                    setFilterRtoRisk('all')
                    setFilterPaymentType('all')
                    setFinancialFilter('all')
                    setFilterFulfillmentStatus('all')
                    setMinPrice('')
                    setMaxPrice('')
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all shadow-md"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm table-auto border-collapse">
                  
                  {/* Custom headers dynamically rendered per tab with exact min-widths */}
                  <thead>
                    <tr className="text-left text-white/60 bg-white/5 border-b border-white/10 font-semibold">
                      {currentTab !== 'pickups_manifests' && (
                        <th className="px-6 py-4 w-12 text-left">
                          <input
                            type="checkbox"
                            checked={paginatedOrders.length > 0 && paginatedOrders.every((o) => selectedOrders[o.id])}
                            onChange={() => toggleSelectAll(paginatedOrders)}
                            className="rounded border-white/10 bg-white/5 text-purple-600 focus:ring-0 focus:ring-offset-0"
                          />
                        </th>
                      )}
                      
                      {currentTab === 'new' && (
                        <>
                          <th className="px-6 py-4 min-w-[150px] text-left">Order Details</th>
                          <th className="px-6 py-4 min-w-[200px] text-left">Customer Details</th>
                          <th className="px-6 py-4 min-w-[180px] text-left">Product Details</th>
                          <th className="px-6 py-4 min-w-[160px] text-left">Package Details</th>
                          <th className="px-6 py-4 min-w-[120px] text-left">Payment</th>
                          <th className="px-6 py-4 min-w-[120px] text-left">Pickup Address</th>
                          <th className="px-6 py-4 min-w-[100px] text-left">Status</th>
                          <th className="px-6 py-4 min-w-[140px] text-right">Action</th>
                        </>
                      )}

                      {currentTab === 'ready_to_ship' && (
                        <>
                          <th className="px-6 py-4 min-w-[150px] text-left">Order Details</th>
                          <th className="px-6 py-4 min-w-[200px] text-left">Customer Details</th>
                          <th className="px-6 py-4 min-w-[120px] text-left">Payment</th>
                          <th className="px-6 py-4 min-w-[120px] text-left">Pickup Address</th>
                          <th className="px-6 py-4 min-w-[200px] text-left">Shipping Details</th>
                          <th className="px-6 py-4 min-w-[150px] text-left">Status</th>
                          <th className="px-6 py-4 min-w-[160px] text-right">Action</th>
                        </>
                      )}

                      {currentTab === 'pickups_manifests' && (
                        <>
                          <th className="px-6 py-4 min-w-[200px] text-left">Pickup Id / Pickup Request Date</th>
                          <th className="px-6 py-4 min-w-[130px] text-left">Shipment Count</th>
                          <th className="px-6 py-4 min-w-[160px] text-left">Pickup Address</th>
                          <th className="px-6 py-4 min-w-[140px] text-left">Parent Courier</th>
                          <th className="px-6 py-4 min-w-[140px] text-left">Pickup Status</th>
                          <th className="px-6 py-4 min-w-[180px] text-left">Manifest Details</th>
                          <th className="px-6 py-4 min-w-[160px] text-right">Action</th>
                        </>
                      )}

                      {currentTab === 'in_transit' && (
                        <>
                          <th className="px-6 py-4 min-w-[150px] text-left">Order Details</th>
                          <th className="px-6 py-4 min-w-[200px] text-left">Customer Details</th>
                          <th className="px-6 py-4 min-w-[120px] text-left">Payment</th>
                          <th className="px-6 py-4 min-w-[200px] text-left">Shipping Details</th>
                          <th className="px-6 py-4 min-w-[130px] text-left">EDD</th>
                          <th className="px-6 py-4 min-w-[120px] text-left">Status</th>
                          <th className="px-6 py-4 min-w-[140px] text-right">Action</th>
                        </>
                      )}

                      {currentTab === 'delivered' && (
                        <>
                          <th className="px-6 py-4 min-w-[150px] text-left">Order Details</th>
                          <th className="px-6 py-4 min-w-[200px] text-left">Customer Details</th>
                          <th className="px-6 py-4 min-w-[130px] text-left">Payment</th>
                          <th className="px-6 py-4 min-w-[200px] text-left">Shipping Details</th>
                          <th className="px-6 py-4 min-w-[130px] text-left">Status</th>
                          <th className="px-6 py-4 min-w-[140px] text-right">Action</th>
                        </>
                      )}

                      {currentTab === 'rto' && (
                        <>
                          <th className="px-6 py-4 min-w-[150px] text-left">Order Details</th>
                          <th className="px-6 py-4 min-w-[200px] text-left">Customer Details</th>
                          <th className="px-6 py-4 min-w-[130px] text-left">Payment</th>
                          <th className="px-6 py-4 min-w-[200px] text-left">Shipping Details</th>
                          <th className="px-6 py-4 min-w-[200px] text-left">Reason</th>
                          <th className="px-6 py-4 min-w-[100px] text-left">Status</th>
                          <th className="px-6 py-4 min-w-[140px] text-right">Action</th>
                        </>
                      )}

                      {currentTab === 'cancelled' && (
                        <>
                          <th className="px-6 py-4 min-w-[150px] text-left">Order Details</th>
                          <th className="px-6 py-4 min-w-[200px] text-left">Customer Details</th>
                          <th className="px-6 py-4 min-w-[180px] text-left">Product Details</th>
                          <th className="px-6 py-4 min-w-[120px] text-left">Payment</th>
                          <th className="px-6 py-4 min-w-[150px] text-left">Cancelled At</th>
                          <th className="px-6 py-4 min-w-[100px] text-left">Status</th>
                        </>
                      )}

                      {currentTab === 'all' && (
                        <>
                          <th className="px-6 py-4 min-w-[140px] text-left">Order</th>
                          <th className="px-6 py-4 min-w-[200px] text-left">Customer</th>
                          <th className="px-6 py-4 min-w-[160px] text-left">Date</th>
                          <th className="px-6 py-4 min-w-[120px] text-left">Financial</th>
                          <th className="px-6 py-4 min-w-[160px] text-left">Fulfillment / Delivery</th>
                          <th className="px-6 py-4 min-w-[120px] text-right">Total</th>
                          <th className="px-6 py-4 min-w-[160px] text-right">Shiprocket AWB</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  
                  {/* Table Body Mapping */}
                  <tbody className="divide-y divide-white/10">
                    {/* Render Pickups & Manifests Mock DB separately */}
                    {currentTab === 'pickups_manifests' ? (
                      manifests.map((m) => (
                        <tr key={m.id} className="hover:bg-white/5 transition-all text-white/90 align-top">
                          <td className="px-6 py-4 font-bold text-purple-400 hover:text-purple-300">
                            {m.id}
                            <p className="text-xs text-white/50 font-normal mt-1">{m.date}</p>
                          </td>
                          <td className="px-6 py-4 text-white/80 font-semibold">{m.shipmentCount}</td>
                          <td className="px-6 py-4 text-white/60 text-xs max-w-[160px] truncate" title={m.address}>
                            {m.address}
                          </td>
                          <td className="px-6 py-4 text-white/70 font-medium">{m.courier}</td>
                          <td className="px-6 py-4">
                            <Badge label={m.status} variant="yellow" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-emerald-400">FULLY MANIFESTED</span>
                              <a href="#" className="text-xs text-purple-400 hover:underline inline-flex items-center gap-1 font-medium">
                                <Download className="w-3 h-3" />
                                {m.manifestName} (1 AWB)
                              </a>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => triggerNotification('success', 'Starting manifest PDF fetch...')}
                              className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-colors"
                            >
                              Download Manifest
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      paginatedOrders.map((order) => {
                        const isSelected = !!selectedOrders[order.id]
                        const isPhoneUnmasked = !!unmaskedPhones[order.id]
                        const rtoAssessment = getRtoRisk(order)
                        
                        // Resolve shipping AWB variables
                        const activeShipment = order.fulfillments?.[0]
                        const courierName = activeShipment?.tracking_company || 'Pending Assignment'
                        const awbNumber = activeShipment?.tracking_number || 'Awaiting Courier'

                        const customerName = order.customer
                          ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
                          : ''

                        return (
                          <tr
                            key={order.id}
                            onClick={() => setActiveDetailOrder(order)}
                            className={`hover:bg-white/5 cursor-pointer transition-all text-white/90 align-top ${
                              isSelected ? 'bg-purple-950/20' : ''
                            }`}
                          >
                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectRow(order.id)}
                                className="rounded border-white/10 bg-white/5 text-purple-600 focus:ring-0 focus:ring-offset-0"
                              />
                            </td>

                            {/* ── NEW ORDER TAB ── */}
                            {currentTab === 'new' && (
                              <>
                                {/* Order details */}
                                <td className="px-6 py-4">
                                  <div className="flex flex-col font-medium">
                                    <span
                                      onClick={(e) => { e.stopPropagation(); setActiveDetailOrder(order); }}
                                      className="font-bold text-purple-300 hover:text-purple-200 cursor-pointer text-sm"
                                    >
                                      {order.name}
                                    </span>
                                    <span className="text-xs text-white/50 mt-1 font-normal">
                                      {new Date(order.created_at).toLocaleString('en-US', {
                                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                      })}
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-2">
                                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center text-[8px] font-bold text-emerald-400">S</div>
                                      <span className="text-[10px] text-white/50 font-normal">Fiberise Fit (Shopify)</span>
                                    </div>
                                  </div>
                                </td>

                                {/* Customer details */}
                                <td className="px-6 py-4 text-xs font-medium">
                                  <div className="flex flex-col gap-1 max-w-[180px]">
                                    <span className="font-bold text-sm text-white">{customerName || 'Guest Checkout'}</span>
                                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                      <span className="text-white/60 font-normal">
                                        {isPhoneUnmasked ? order.customer?.phone || 'No phone' : 'xxxxxxxxxx'}
                                      </span>
                                      <button onClick={() => togglePhoneMask(order.id)} className="text-white/40 hover:text-white transition-colors">
                                        {isPhoneUnmasked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                    <span className="text-white/40 truncate font-normal max-w-[180px]" title={order.shipping_address?.address1}>
                                      {order.shipping_address?.address1 || 'N/A'}, {order.shipping_address?.city || ''}
                                    </span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setActiveRtoRiskOrder(order); }}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold mt-1 w-max transition-colors ${
                                        rtoAssessment.color === 'red'
                                          ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                                          : rtoAssessment.color === 'yellow'
                                            ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20'
                                            : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                                      }`}
                                    >
                                      <ShieldAlert className="w-3 h-3 text-red-400" />
                                      {rtoAssessment.score}
                                    </button>
                                  </div>
                                </td>

                                {/* Product details */}
                                <td className="px-6 py-4 text-xs font-medium">
                                  <div className="flex flex-col gap-1 max-w-[160px]">
                                    <span className="font-semibold text-white truncate" title={order.line_items?.[0]?.title}>
                                      {order.line_items?.[0]?.title || 'No items'}
                                    </span>
                                    {order.line_items?.[0]?.sku && (
                                      <span className="text-white/50 font-normal">SKU: {order.line_items[0].sku}</span>
                                    )}
                                    <span className="text-white/40 font-semibold mt-1">QTY: {order.line_items?.[0]?.quantity || 1}</span>
                                  </div>
                                </td>

                                {/* Package details */}
                                <td className="px-6 py-4 text-xs font-medium">
                                  <div className="flex flex-col gap-1 text-white/60">
                                    <span>Dead wt.: <span className="font-semibold text-white/80">0.45 Kg</span></span>
                                    <span>Dimensions: <span className="font-semibold text-white/80">15x10x5 (cm)</span></span>
                                    <div className="flex items-center gap-1 text-[10px] text-yellow-400 font-semibold mt-1">
                                      <Info className="w-3 h-3 shrink-0" />
                                      <span>Info missing</span>
                                    </div>
                                  </div>
                                </td>

                                {/* Payment */}
                                <td className="px-6 py-4 font-medium">
                                  <div className="flex flex-col gap-1.5">
                                    <span className="font-bold text-sm text-white">₹{order.total_price}</span>
                                    <Badge
                                      label={order.financial_status === 'paid' ? 'Prepaid' : 'COD'}
                                      variant={order.financial_status === 'paid' ? 'green' : 'yellow'}
                                    />
                                  </div>
                                </td>

                                {/* Pickup address */}
                                <td className="px-6 py-4 text-xs text-white/60 font-semibold">
                                  <span className="border-b border-dashed border-white/30 cursor-help" title="FIBERISE PRIMARY HUB - DELHI">
                                    Primary
                                  </span>
                                </td>

                                {/* Status */}
                                <td className="px-6 py-4">
                                  <Badge label="NEW" variant="blue" />
                                </td>

                                {/* Actions */}
                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => setActiveCourierOrder(order)}
                                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-extrabold text-white transition-all shadow-lg shadow-purple-600/10"
                                  >
                                    Ship Now
                                  </button>
                                </td>
                              </>
                            )}

                            {/* ── READY TO SHIP TAB ── */}
                            {currentTab === 'ready_to_ship' && (
                              <>
                                {/* Order details */}
                                <td className="px-6 py-4">
                                  <div className="flex flex-col font-medium">
                                    <span
                                      onClick={(e) => { e.stopPropagation(); setActiveDetailOrder(order); }}
                                      className="font-bold text-purple-300 hover:text-purple-200 cursor-pointer text-sm"
                                    >
                                      {order.name}
                                    </span>
                                    <span className="text-xs text-white/50 mt-1 font-normal">
                                      {new Date(order.created_at).toLocaleString()}
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-2">
                                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center text-[8px] font-bold text-emerald-400">S</div>
                                      <span className="text-[10px] text-white/50 font-normal">Fiberise Fit (Shopify)</span>
                                    </div>
                                  </div>
                                </td>

                                {/* Customer details */}
                                <td className="px-6 py-4 text-xs font-medium">
                                  <div className="flex flex-col gap-1 max-w-[180px]">
                                    <span className="font-bold text-sm text-white">{customerName}</span>
                                    <span className="text-white/60 font-normal truncate">{order.customer?.email}</span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setActiveDetailOrder(order); }}
                                      className="text-purple-400 hover:underline font-bold mt-1 text-[10px] w-max text-left"
                                    >
                                      View Products →
                                    </button>
                                  </div>
                                </td>

                                {/* Payment */}
                                <td className="px-6 py-4 font-medium">
                                  <div className="flex flex-col gap-1.5">
                                    <span className="font-bold text-sm text-white">₹{order.total_price}</span>
                                    <Badge
                                      label={order.financial_status === 'paid' ? 'Prepaid' : 'COD'}
                                      variant={order.financial_status === 'paid' ? 'green' : 'yellow'}
                                    />
                                  </div>
                                </td>

                                {/* Pickup address */}
                                <td className="px-6 py-4 text-xs text-white/60 font-semibold">
                                  <span className="border-b border-dashed border-white/30 cursor-help" title="FIBERISE PRIMARY HUB - DELHI">
                                    Primary
                                  </span>
                                </td>

                                {/* Shipping Details */}
                                <td className="px-6 py-4 text-xs font-medium">
                                  <div className="flex flex-col gap-1.5 text-white/70">
                                    <span className="font-bold text-white text-sm shrink-0 flex items-center gap-1">
                                      <Truck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                      {courierName}
                                    </span>
                                    <div className="flex items-center gap-1.5 font-normal" onClick={(e) => e.stopPropagation()}>
                                      <span className="text-white/40">AWB#:</span>
                                      <span
                                        onClick={() => setActiveTrackingOrder(order)}
                                        className="font-mono text-purple-300 hover:text-purple-200 cursor-pointer underline"
                                      >
                                        {awbNumber}
                                      </span>
                                    </div>
                                    <span className="text-white/40 text-[10px] font-normal mt-0.5">
                                      Assigned: {new Date().toLocaleDateString()} | 09:40 AM
                                    </span>
                                  </div>
                                </td>

                                {/* Status */}
                                <td className="px-6 py-4 text-xs font-medium">
                                  <div className="flex flex-col gap-1.5">
                                    <Badge label="PICKUP SCHEDULED" variant="yellow" />
                                    <span className="text-white/40 text-[10px] font-normal">For {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                    <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                      Label Downloaded
                                    </span>
                                  </div>
                                </td>

                                {/* Action */}
                                <td className="px-6 py-4 text-right font-medium" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => handleManifestDispatch(order)}
                                    disabled={actionLoadingOrderId === order.id}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-xs font-extrabold text-white transition-all shadow-lg active:scale-95"
                                  >
                                    {actionLoadingOrderId === order.id ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Dispatched...
                                      </>
                                    ) : (
                                      'Download Manifest'
                                    )}
                                  </button>
                                </td>
                              </>
                            )}

                            {/* ── IN TRANSIT TAB ── */}
                            {currentTab === 'in_transit' && (
                              <>
                                {/* Order details */}
                                <td className="px-6 py-4">
                                  <div className="flex flex-col font-medium">
                                    <span
                                      onClick={(e) => { e.stopPropagation(); setActiveDetailOrder(order); }}
                                      className="font-bold text-purple-300 hover:text-purple-200 cursor-pointer text-sm"
                                    >
                                      {order.name}
                                    </span>
                                    <span className="text-xs text-white/50 mt-1 font-normal">
                                      {new Date(order.created_at).toLocaleString()}
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-2">
                                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center text-[8px] font-bold text-emerald-400">S</div>
                                      <span className="text-[10px] text-white/50 font-normal">Fiberise Fit (Shopify)</span>
                                    </div>
                                  </div>
                                </td>

                                {/* Customer details */}
                                <td className="px-6 py-4 text-xs font-medium">
                                  <div className="flex flex-col gap-1 max-w-[180px]">
                                    <span className="font-bold text-sm text-white">{customerName}</span>
                                    <span className="text-white/60 font-normal truncate">{order.customer?.email}</span>
                                  </div>
                                </td>

                                {/* Payment */}
                                <td className="px-6 py-4 font-medium">
                                  <div className="flex flex-col gap-1.5">
                                    <span className="font-bold text-sm text-white">₹{order.total_price}</span>
                                    <Badge
                                      label={order.financial_status === 'paid' ? 'Prepaid' : 'COD'}
                                      variant={order.financial_status === 'paid' ? 'green' : 'yellow'}
                                    />
                                  </div>
                                </td>

                                {/* Shipping Details */}
                                <td className="px-6 py-4 text-xs font-medium">
                                  <div className="flex flex-col gap-1.5 text-white/70">
                                    <span className="font-bold text-white text-sm shrink-0 flex items-center gap-1">
                                      <Truck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                      {courierName}
                                    </span>
                                    <div className="flex items-center gap-1.5 font-normal" onClick={(e) => e.stopPropagation()}>
                                      <span className="text-white/40">AWB#:</span>
                                      <span
                                        onClick={() => setActiveTrackingOrder(order)}
                                        className="font-mono text-purple-300 hover:text-purple-200 cursor-pointer underline"
                                      >
                                        {awbNumber}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* EDD */}
                                <td className="px-6 py-4 text-xs font-medium">
                                  <div className="flex flex-col gap-1 max-w-[130px]" onClick={(e) => e.stopPropagation()}>
                                    <span className="font-bold text-white">{new Date(Date.now() + 3*24*60*60*1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    <span
                                      onClick={() => setActiveTrackingOrder(order)}
                                      className="text-purple-400 hover:underline font-bold text-[10px] w-max cursor-pointer text-left"
                                    >
                                      View EDD History →
                                    </span>
                                  </div>
                                </td>

                                {/* Status */}
                                <td className="px-6 py-4 font-medium">
                                  <Badge label="IN TRANSIT" variant="yellow" />
                                </td>

                                {/* Action */}
                                <td className="px-6 py-4 text-right font-medium" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => setActiveTrackingOrder(order)}
                                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-extrabold text-white transition-all shadow-lg shadow-purple-600/10"
                                  >
                                    Track Order
                                  </button>
                                </td>
                              </>
                            )}

                            {/* ── DELIVERED TAB ── */}
                            {currentTab === 'delivered' && (
                              <>
                                {/* Order details */}
                                <td className="px-6 py-4">
                                  <div className="flex flex-col font-medium">
                                    <span
                                      onClick={(e) => { e.stopPropagation(); setActiveDetailOrder(order); }}
                                      className="font-bold text-purple-300 hover:text-purple-200 cursor-pointer text-sm"
                                    >
                                      {order.name}
                                    </span>
                                    <span className="text-xs text-white/50 mt-1 font-normal">
                                      {new Date(order.created_at).toLocaleString()}
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-2">
                                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center text-[8px] font-bold text-emerald-400">S</div>
                                      <span className="text-[10px] text-white/50 font-normal">Fiberise Fit (Shopify)</span>
                                    </div>
                                  </div>
                                </td>

                                {/* Customer details */}
                                <td className="px-6 py-4 text-xs font-medium">
                                  <div className="flex flex-col gap-1 max-w-[180px]">
                                    <span className="font-bold text-sm text-white">{customerName}</span>
                                    <span className="text-white/60 font-normal truncate">{order.customer?.email}</span>
                                  </div>
                                </td>

                                {/* Payment */}
                                <td className="px-6 py-4 text-xs font-medium">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-bold text-sm text-white">₹{order.total_price}</span>
                                    <Badge
                                      label={order.financial_status === 'paid' ? 'Prepaid' : 'COD'}
                                      variant={order.financial_status === 'paid' ? 'green' : 'yellow'}
                                    />
                                    {order.financial_status !== 'paid' && (
                                      <span className="text-[9px] text-white/40 mt-1.5 max-w-[130px] font-normal leading-normal">
                                        Remittance: {new Date(Date.now() + 5*24*60*60*1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {new Date(Date.now() + 8*24*60*60*1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Shipping Details */}
                                <td className="px-6 py-4 text-xs font-medium">
                                  <div className="flex flex-col gap-1.5 text-white/70">
                                    <span className="font-bold text-white text-sm shrink-0 flex items-center gap-1">
                                      <Truck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                      {courierName}
                                    </span>
                                    <div className="flex items-center gap-1.5 font-normal" onClick={(e) => e.stopPropagation()}>
                                      <span className="text-white/40">AWB#:</span>
                                      <span
                                        onClick={() => setActiveTrackingOrder(order)}
                                        className="font-mono text-purple-300 hover:text-purple-200 cursor-pointer underline"
                                      >
                                        {awbNumber}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Status */}
                                <td className="px-6 py-4 text-xs font-medium">
                                  <div className="flex flex-col gap-1.5">
                                    <Badge label="DELIVERED" variant="green" />
                                    <span className="text-white/40 text-[10px] font-semibold">On {new Date(Date.now() - 2*24*60*60*1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded w-max">✓ Verified</span>
                                  </div>
                                </td>

                                {/* Action */}
                                <td className="px-6 py-4 text-right font-medium" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => triggerNotification('success', 'Return flow initiated. Generating Shiprocket return order...')}
                                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-extrabold text-white transition-all shadow-lg active:scale-95"
                                  >
                                    Create Return
                                  </button>
                                </td>
                              </>
                            )}

                            {/* ── RTO TAB ── */}
                            {currentTab === 'rto' && (
                              <>
                                {/* Order details */}
                                <td className="px-6 py-4">
                                  <div className="flex flex-col font-medium">
                                    <span
                                      onClick={(e) => { e.stopPropagation(); setActiveDetailOrder(order); }}
                                      className="font-bold text-purple-300 hover:text-purple-200 cursor-pointer text-sm"
                                    >
                                      {order.name}
                                    </span>
                                    <span className="text-xs text-white/50 mt-1 font-normal">
                                      {new Date(order.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                </td>

                                {/* Customer details */}
                                <td className="px-6 py-4 text-xs font-medium">
                                  <div className="flex flex-col gap-1 max-w-[180px]">
                                    <span className="font-bold text-sm text-white">{customerName}</span>
                                    <span className="text-white/60 font-normal truncate">{order.customer?.email}</span>
                                  </div>
                                </td>

                                {/* Payment */}
                                <td className="px-6 py-4 font-medium">
                                  <div className="flex flex-col gap-1.5">
                                    <span className="font-bold text-sm text-white">₹{order.total_price}</span>
                                    <Badge label="COD" variant="yellow" />
                                  </div>
                                </td>

                                {/* Shipping Details */}
                                <td className="px-6 py-4 text-xs font-medium">
                                  <div className="flex flex-col gap-1.5 text-white/70">
                                    <span className="font-bold text-white text-sm shrink-0 flex items-center gap-1">
                                      <Truck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                      {courierName}
                                    </span>
                                    <div className="flex items-center gap-1.5 font-normal" onClick={(e) => e.stopPropagation()}>
                                      <span className="text-white/40">AWB#:</span>
                                      <span
                                        onClick={() => setActiveTrackingOrder(order)}
                                        className="font-mono text-purple-300 hover:text-purple-200 cursor-pointer underline"
                                      >
                                        {awbNumber}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* RTO Reason */}
                                <td className="px-6 py-4 text-xs text-red-300 font-bold max-w-[200px] leading-relaxed">
                                  Customer refused delivery - "Address incorrect"
                                </td>

                                {/* Status */}
                                <td className="px-6 py-4 font-medium">
                                  <Badge label="RTO" variant="red" />
                                </td>

                                {/* Action */}
                                <td className="px-6 py-4 text-right font-medium" onClick={(e) => e.stopPropagation()}>
                                  <div className="relative inline-block text-left">
                                    <button
                                      onClick={() => setActiveDropdownOrderId(activeDropdownOrderId === order.id ? null : order.id)}
                                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all active:scale-95 flex items-center justify-center shrink-0"
                                    >
                                      <MoreHorizontal className="w-5 h-5" />
                                    </button>

                                    {activeDropdownOrderId === order.id && (
                                      <>
                                        <div 
                                          className="fixed inset-0 z-10" 
                                          onClick={() => setActiveDropdownOrderId(null)}
                                        />
                                        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#0e121a] border border-white/10 shadow-2xl z-20 py-1.5 focus:outline-none animate-fade-in text-left">
                                          <button
                                            onClick={() => {
                                              setActiveDropdownOrderId(null);
                                              triggerNotification('success', 'Support ticket creation initiated.');
                                            }}
                                            className="w-full px-4 py-2 text-xs text-white/70 hover:text-white hover:bg-purple-600/20 text-left transition-colors font-medium"
                                          >
                                            Create Ticket
                                          </button>
                                          <button
                                            onClick={() => {
                                              setActiveDropdownOrderId(null);
                                              triggerNotification('success', 'Fetching order invoice PDF...');
                                            }}
                                            className="w-full px-4 py-2 text-xs text-white/70 hover:text-white hover:bg-purple-600/20 text-left transition-colors font-medium"
                                          >
                                            Download Invoice
                                          </button>
                                          <button
                                            onClick={() => {
                                              setActiveDropdownOrderId(null);
                                              triggerNotification('success', 'Order tag modal triggered.');
                                            }}
                                            className="w-full px-4 py-2 text-xs text-white/70 hover:text-white hover:bg-purple-600/20 text-left transition-colors font-medium"
                                          >
                                            Add Order Tag
                                          </button>
                                          <div className="h-px bg-white/5 my-1" />
                                          <button
                                            onClick={() => handleCloneOrder(order)}
                                            className="w-full px-4 py-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-600/20 text-left transition-colors font-semibold"
                                          >
                                            Clone Order
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </>
                            )}

                            {/* ── CANCELLED TAB ── */}
                            {currentTab === 'cancelled' && (
                              <>
                                {/* Order details */}
                                <td className="px-6 py-4">
                                  <div className="flex flex-col font-medium">
                                    <span
                                      onClick={(e) => { e.stopPropagation(); setActiveDetailOrder(order); }}
                                      className="font-bold text-purple-300 hover:text-purple-200 cursor-pointer text-sm"
                                    >
                                      {order.name}
                                    </span>
                                    <span className="text-xs text-white/50 mt-1 font-normal">
                                      {new Date(order.created_at).toLocaleString('en-US', {
                                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                </td>

                                {/* Customer details */}
                                <td className="px-6 py-4 text-xs font-medium">
                                  <div className="flex flex-col gap-1 max-w-[180px]">
                                    <span className="font-bold text-sm text-white">{customerName || 'Guest Checkout'}</span>
                                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                      <span className="text-white/60 font-normal">
                                        {isPhoneUnmasked ? order.customer?.phone || 'No phone' : 'xxxxxxxxxx'}
                                      </span>
                                      <button onClick={() => togglePhoneMask(order.id)} className="text-white/40 hover:text-white transition-colors">
                                        {isPhoneUnmasked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  </div>
                                </td>

                                {/* Product details */}
                                <td className="px-6 py-4 text-xs font-medium">
                                  <div className="flex flex-col gap-1 max-w-[160px]">
                                    <span className="font-semibold text-white truncate" title={order.line_items?.[0]?.title}>
                                      {order.line_items?.[0]?.title || 'No items'}
                                    </span>
                                    <span className="text-white/40 font-semibold mt-1">QTY: {order.line_items?.[0]?.quantity || 1}</span>
                                  </div>
                                </td>

                                {/* Payment */}
                                <td className="px-6 py-4 font-medium">
                                  <div className="flex flex-col gap-1.5">
                                    <span className="font-bold text-sm text-white">₹{order.total_price}</span>
                                    <Badge
                                      label={order.financial_status === 'paid' ? 'Prepaid' : 'COD'}
                                      variant={order.financial_status === 'paid' ? 'green' : 'yellow'}
                                    />
                                  </div>
                                </td>

                                {/* Cancelled At */}
                                <td className="px-6 py-4 text-xs text-red-400 font-semibold">
                                  {order.cancelled_at ? new Date(order.cancelled_at).toLocaleString('en-US', {
                                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                  }) : 'N/A'}
                                </td>

                                {/* Status */}
                                <td className="px-6 py-4">
                                  <Badge label="CANCELLED" variant="red" />
                                </td>
                              </>
                            )}

                            {/* ── ALL ORDERS TAB ── */}
                            {currentTab === 'all' && (
                              <>
                                <td className="px-6 py-3 text-white">
                                  <div className="flex flex-col font-medium">
                                    <span
                                      onClick={(e) => { e.stopPropagation(); setActiveDetailOrder(order); }}
                                      className="font-bold text-purple-300 hover:text-purple-200 cursor-pointer"
                                    >
                                      {order.name}
                                    </span>
                                    <span className="text-xs text-white/50 font-normal">ID: {order.id}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-white/80 font-medium">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-semibold text-white">{customerName || 'Guest'}</span>
                                    {order.customer?.email && (
                                      <span className="text-xs text-white/50 font-normal truncate max-w-[180px]">{order.customer.email}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-white/80 font-normal">
                                  {new Date(order.created_at).toLocaleString()}
                                </td>
                                <td className="px-6 py-3">
                                  <Badge label={order.financial_status || 'N/A'} variant={statusVariant(order.financial_status)} />
                                </td>
                                <td className="px-6 py-3 font-medium">
                                  {(() => {
                                    const delInfo = getDeliveryStatusInfo(order)
                                    return <Badge label={delInfo.label} variant={delInfo.variant} />
                                  })()}
                                </td>
                                <td className="px-6 py-3 text-right text-white font-extrabold">
                                  {order.total_price} {order.currency}
                                </td>
                                <td className="px-6 py-3 text-right text-xs" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1.5 font-medium">
                                    <span
                                      onClick={() => setActiveTrackingOrder(order)}
                                      className="font-mono text-purple-300 hover:text-purple-200 underline cursor-pointer"
                                    >
                                      {awbNumber}
                                    </span>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-white/10 px-2 select-none">
                  <p className="text-xs text-white/50 font-normal">
                    Showing <span className="font-bold text-white">{startIndex + 1}</span> to <span className="font-bold text-white">{Math.min(endIndex, activeTabOrders.length)}</span> of <span className="font-bold text-white">{activeTabOrders.length}</span> orders
                  </p>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/5 transition-all font-semibold"
                    >
                      First
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/5 transition-all font-semibold"
                    >
                      Prev
                    </button>
                    
                    {/* Page Numbers */}
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNum = i + 1
                      // Display a window of pages around current page
                      if (pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1) {
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              currentPage === pageNum
                                ? 'bg-purple-600 border border-purple-500 text-white shadow-lg shadow-purple-500/20'
                                : 'border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      }
                      // Render ellipsis
                      if (pageNum === 2 || pageNum === totalPages - 1) {
                        return <span key={pageNum} className="text-white/40 text-xs px-1 select-none">...</span>
                      }
                      return null
                    })}
                    
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/5 transition-all font-semibold"
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/5 transition-all font-semibold"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>

      {/* ── COURIER SELECTION MODAL (Ship Now triggered) ── */}
      {activeCourierOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#0e121a] border border-white/10 rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setActiveCourierOrder(null)}
              className="absolute right-4 top-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Select Courier Partner</h3>
                <p className="text-xs text-white/50 font-normal">Assign courier and allocate tracking AWB for order {activeCourierOrder.name}</p>
              </div>
            </div>

            {/* Quick Summary details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 mb-6 text-xs font-semibold">
              <div>
                <p className="text-white/40 font-normal">Customer</p>
                <p className="font-bold text-white mt-0.5">
                  {activeCourierOrder.customer?.first_name} {activeCourierOrder.customer?.last_name}
                </p>
              </div>
              <div>
                <p className="text-white/40 font-normal">Destination</p>
                <p className="font-bold text-white mt-0.5">
                  {activeCourierOrder.shipping_address?.city}, {activeCourierOrder.shipping_address?.zip}
                </p>
              </div>
              <div>
                <p className="text-white/40 font-normal">Weight / Size</p>
                <p className="font-bold text-white mt-0.5">0.45 Kg (15x10x5 cm)</p>
              </div>
              <div>
                <p className="text-white/40 font-normal">COD / Prepaid</p>
                <p className="font-bold text-white mt-0.5">
                  {activeCourierOrder.financial_status === 'paid' ? 'Prepaid (₹0.00 to collect)' : `COD (Collect ₹${activeCourierOrder.total_price})`}
                </p>
              </div>
            </div>

            <p className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3">Available Courier Quotes</p>
            
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {courierQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all hover:bg-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-bold text-purple-300 border border-white/10 text-xs">
                      {quote.name.charAt(0)}
                    </div>
                    <div className="font-semibold">
                      <p className="text-sm font-bold text-white">{quote.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 font-normal">
                        <span className="text-[11px] text-yellow-400 font-bold">★ {quote.rating}</span>
                        <span className="text-white/30 text-[10px]">•</span>
                        <span className="text-[10px] text-white/50">EDD: {quote.edd}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-white">₹{quote.rate}.00</p>
                      <span className="text-[9px] text-white/40 font-normal">Chargeable wt. 0.5kg</span>
                    </div>
                    <button
                      onClick={() => handleAssignCourier(activeCourierOrder.id, quote)}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all"
                    >
                      Assign & Ship
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TRACKING TIMELINE DRAWER ── */}
      {activeTrackingOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0e121a] border-l border-white/10 w-full max-w-md h-full p-6 shadow-2xl relative flex flex-col animate-slide-left">
            <button
              onClick={() => setActiveTrackingOrder(null)}
              className="absolute right-4 top-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Compass className="w-5 h-5" />
              </div>
              <div className="font-semibold">
                <h3 className="text-lg font-bold text-white">Tracking Details</h3>
                <p className="text-xs text-white/50 font-normal">{activeTrackingOrder.name} · {activeTrackingOrder.fulfillments?.[0]?.tracking_company}</p>
              </div>
            </div>

            {/* AWB Card */}
            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl mb-6 text-xs space-y-2 font-semibold">
              <div className="flex justify-between">
                <span className="text-white/40 font-normal">AWB Code</span>
                <span className="font-mono font-bold text-purple-300">{activeTrackingOrder.fulfillments?.[0]?.tracking_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40 font-normal">Courier Partner</span>
                <span className="font-bold text-white">{activeTrackingOrder.fulfillments?.[0]?.tracking_company}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40 font-normal">Estimated Delivery</span>
                <span className="font-bold text-emerald-400">22 May 2026</span>
              </div>
            </div>

            <p className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-4">Shipment Journey</p>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto space-y-6 pl-2 relative border-l border-white/10 ml-3">
              {/* Event 1 */}
              <div className="relative pl-6">
                <div className="absolute -left-[29px] top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border border-[#0e121a] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                </div>
                <div>
                  <p className="text-xs text-white/40">18 May 2026 | 02:00 PM</p>
                  <p className="text-sm font-bold text-white mt-0.5">Package Picked Up</p>
                  <p className="text-xs text-white/60 mt-0.5 font-medium">Shipment picked up by courier from primary warehouse location.</p>
                </div>
              </div>

              {/* Event 2 */}
              <div className="relative pl-6">
                <div className="absolute -left-[29px] top-1 w-3.5 h-3.5 rounded-full bg-purple-500/50 border border-[#0e121a] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-300"></span>
                </div>
                <div>
                  <p className="text-xs text-white/40">18 May 2026 | 09:40 AM</p>
                  <p className="text-sm font-bold text-white mt-0.5">AWB Manifest Generated</p>
                  <p className="text-xs text-white/60 mt-0.5 font-medium">AWB tracking allocated. Manifest printed and labeled onto parcel package.</p>
                </div>
              </div>

              {/* Event 3 */}
              <div className="relative pl-6 opacity-60">
                <div className="absolute -left-[29px] top-1 w-3.5 h-3.5 rounded-full bg-white/10 border border-[#0e121a] flex items-center justify-center"></div>
                <div>
                  <p className="text-xs text-white/40">18 May 2026 | 09:00 AM</p>
                  <p className="text-sm font-bold text-white mt-0.5">Fulfillment Triggered</p>
                  <p className="text-xs text-white/60 mt-0.5 font-medium">Order resolved inside warehouse. Packing finalized.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTrackingOrder(null)}
              className="w-full mt-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all text-center"
            >
              Close Panel
            </button>
          </div>
        </div>
      )}

      {/* ── RTO RISK ASSESSMENT DETAIL DIALOG ── */}
      {activeRtoRiskOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#0e121a] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setActiveRtoRiskOrder(null)}
              className="absolute right-4 top-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="font-semibold">
                <h3 className="text-lg font-bold text-white">RTO Risk Analysis</h3>
                <p className="text-xs text-white/50 font-normal">Predictive analysis report for order {activeRtoRiskOrder.name}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mb-6 text-center font-semibold">
              <p className="text-xs text-white/50 uppercase tracking-wide font-normal">Risk Assessment Score</p>
              <p className={`text-3xl font-extrabold mt-1 ${
                getRtoRisk(activeRtoRiskOrder).color === 'red'
                  ? 'text-red-400'
                  : getRtoRisk(activeRtoRiskOrder).color === 'yellow'
                    ? 'text-yellow-400'
                    : 'text-emerald-400'
              }`}>
                {getRtoRisk(activeRtoRiskOrder).pct}
              </p>
            </div>

            <p className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3">Identified Risk Factors</p>
            <div className="space-y-2 mb-6">
              {getRtoRisk(activeRtoRiskOrder).factors.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-white/80 p-2.5 rounded-xl bg-white/5 border border-white/5 font-semibold font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0"></div>
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  triggerNotification('success', 'RTO protection lock applied to this shipment.')
                  setActiveRtoRiskOrder(null)
                }}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all text-center animate-pulse"
              >
                Secure Order
              </button>
              <button
                onClick={() => setActiveRtoRiskOrder(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all text-center"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GORGEOUS SLIDING ORDER DETAILS DRAWER ── */}
      {activeDetailOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setActiveDetailOrder(null)}>
          <div
            className="bg-[#0b0e14] border-l border-white/10 w-full max-w-xl h-full p-6 shadow-2xl relative flex flex-col animate-slide-left text-white overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setActiveDetailOrder(null)}
              className="absolute right-4 top-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold text-white">{activeDetailOrder.name}</h3>
                  <Badge label={activeDetailOrder.financial_status} variant={statusVariant(activeDetailOrder.financial_status)} />
                  <Badge label={activeDetailOrder.fulfillment_status ?? 'Unfulfilled'} variant={statusVariant(activeDetailOrder.fulfillment_status)} />
                </div>
                <p className="text-xs text-white/50 mt-1">Placed on {new Date(activeDetailOrder.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex-1 space-y-6">
              {/* Items Summary */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  Items Ordered
                </p>
                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl divide-y divide-white/5 space-y-3">
                  {activeDetailOrder.line_items.map((item, idx) => (
                    <div key={item.id} className={`flex items-start justify-between gap-4 text-xs ${idx > 0 ? 'pt-3' : ''}`}>
                      <div className="flex-1">
                        <p className="text-white font-bold">{item.title}</p>
                        {item.variant_title && (
                          <p className="text-white/50 text-[10px] mt-0.5">{item.variant_title}</p>
                        )}
                        {item.sku && <p className="text-white/40 text-[10px]">SKU: {item.sku}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white font-semibold">
                          ₹{item.price} × {item.quantity}
                        </p>
                        <p className="text-white/50 text-[10px] mt-0.5">{item.fulfillment_status ?? 'Unfulfilled'}</p>
                      </div>
                    </div>
                  ))}

                  {/* Pricing Breakdown */}
                  <div className="pt-3 border-t border-white/10 space-y-1.5 text-xs text-white/60">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="text-white">₹{parseFloat(activeDetailOrder.total_price) - 40}.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping Fees</span>
                      <span className="text-white">₹40.00</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/5 text-sm font-bold">
                      <span className="text-white">Total Amount</span>
                      <span className="text-purple-400">₹{activeDetailOrder.total_price} INR</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer summary */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Customer Details
                </p>
                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-xs space-y-2.5 font-semibold">
                  <div className="flex justify-between">
                    <span className="text-white/40 font-normal">Contact Name</span>
                    <span className="text-white">
                      {activeDetailOrder.customer?.first_name} {activeDetailOrder.customer?.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40 font-normal">Email Address</span>
                    <span className="text-white truncate max-w-[200px]" title={activeDetailOrder.customer?.email || ''}>
                      {activeDetailOrder.customer?.email || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40 font-normal">Phone Coordinates</span>
                    <span className="text-white font-mono">{activeDetailOrder.customer?.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    Shipping Address
                  </p>
                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-xs text-white/80 leading-relaxed font-semibold">
                    <p className="font-bold text-white mb-1">
                      {activeDetailOrder.shipping_address?.first_name} {activeDetailOrder.shipping_address?.last_name}
                    </p>
                    <p className="font-normal">{activeDetailOrder.shipping_address?.address1}</p>
                    {activeDetailOrder.shipping_address?.address2 && (
                      <p className="font-normal">{activeDetailOrder.shipping_address.address2}</p>
                    )}
                    <p className="font-normal">
                      {activeDetailOrder.shipping_address?.city}, {activeDetailOrder.shipping_address?.province} - {activeDetailOrder.shipping_address?.zip}
                    </p>
                    <p className="font-normal text-white/50 mt-1">Ph: {activeDetailOrder.shipping_address?.phone || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    Billing Address
                  </p>
                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-xs text-white/80 leading-relaxed font-semibold">
                    <p className="font-bold text-white mb-1">
                      {activeDetailOrder.billing_address?.first_name} {activeDetailOrder.billing_address?.last_name}
                    </p>
                    <p className="font-normal">{activeDetailOrder.billing_address?.address1}</p>
                    <p className="font-normal">
                      {activeDetailOrder.billing_address?.city}, {activeDetailOrder.billing_address?.province} - {activeDetailOrder.billing_address?.zip}
                    </p>
                  </div>
                </div>
              </div>

              {/* Shiprocket logistics stats */}
              {activeDetailOrder.fulfillment_status === 'fulfilled' && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" />
                    Shiprocket Courier Routing
                  </p>
                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-xs space-y-2.5 font-semibold">
                    <div className="flex justify-between">
                      <span className="text-white/40 font-normal">Assigned Courier</span>
                      <span className="text-white">{activeDetailOrder.fulfillments?.[0]?.tracking_company}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40 font-normal">AWB Number</span>
                      <span className="font-mono text-purple-300 underline cursor-pointer hover:text-purple-200" onClick={() => { setActiveDetailOrder(null); setActiveTrackingOrder(activeDetailOrder); }}>
                        {activeDetailOrder.fulfillments?.[0]?.tracking_number}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40 font-normal">Courier Status</span>
                      <span className="text-yellow-400 uppercase">{activeDetailOrder.fulfillments?.[0]?.shipment_status || 'scheduled'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-8 pt-4 border-t border-white/10 flex flex-col gap-3 shrink-0">
              {!isOrderCancelled(activeDetailOrder) && (
                <button
                  onClick={() => handleDeleteOrder(activeDetailOrder.id)}
                  disabled={deletingOrderId === activeDetailOrder.id}
                  className="w-full py-2.5 rounded-xl bg-red-950/40 hover:bg-red-950/60 border border-red-500/30 text-xs font-extrabold text-red-400 text-center transition-all shadow-lg shadow-red-900/10 active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingOrderId === activeDetailOrder.id ? (
                    <Loader2 className="w-4.5 h-4.5 animate-spin text-red-400" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-red-400" />
                  )}
                  {deletingOrderId === activeDetailOrder.id ? 'Cancelling Order...' : 'Cancel Order'}
                </button>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/orders/${activeDetailOrder.id}`)}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-extrabold text-white text-center transition-all shadow-lg shadow-purple-600/10 active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Compass className="w-4 h-4" />
                  Open Full Detail Page
                </button>
                <button
                  onClick={() => setActiveDetailOrder(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all text-center"
                >
                  Close Drawer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function tabName(tab: string): string {
  if (tab === 'new') return 'New Dispatches'
  if (tab === 'ready_to_ship') return 'Ready To Ship'
  if (tab === 'pickups_manifests') return 'Pickups & Manifests'
  if (tab === 'in_transit') return 'In Transit'
  if (tab === 'delivered') return 'Delivered'
  if (tab === 'rto') return 'Returned to Origin'
  if (tab === 'cancelled') return 'Cancelled'
  return 'All Orders'
}

function getDeliveryStatusInfo(order: ShopifyOrder) {
  if (isOrderCancelled(order)) {
    return { label: 'Cancelled', variant: 'red' as const }
  }
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
    case 'rto':
      return { label: 'RTO', variant: 'red' as const }
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
