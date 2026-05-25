export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAllShiprocketOrders, cancelShiprocketOrder } from '@/src/services/shiprocketClient'

const SHOP_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN
const API_VERSION = process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION || '2024-01'
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN

import {
  getCachedOrders,
  setCachedOrders,
  getCacheExpiresAt,
  CACHE_TTL_MS,
  getActiveFetchPromise,
  setActiveFetchPromise,
  getCachedOrderById,
  removeOrderFromCache
} from '@/src/services/ordersCache'

// Reusable helper to fetch all Shopify orders (handles pagination loop)
async function fetchAllShopifyOrders(): Promise<any[]> {
  let shopifyOrders: any[] = []
  let nextUrl: string | null = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/orders.json?limit=250&status=any`
  
  while (nextUrl) {
    const res: Response = await fetch(nextUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ADMIN_TOKEN!,
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Shopify API error: ${res.status} ${res.statusText}. ${text}`)
    }

    const data = await res.json()
    if (Array.isArray(data.orders)) {
      shopifyOrders = shopifyOrders.concat(data.orders)
    }

    const linkHeader: string | null = res.headers.get('Link') || res.headers.get('link')
    nextUrl = null
    if (linkHeader) {
      const match: RegExpMatchArray | null = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
      if (match) {
        nextUrl = match[1]
      }
    }
  }
  return shopifyOrders
}

export async function GET(_req: NextRequest) {
  try {
    if (!SHOP_DOMAIN || !ADMIN_TOKEN) {
      return NextResponse.json(
        {
          error:
            'Shopify credentials are not configured. Please set NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN.',
        },
        { status: 500 },
      )
    }

    const { searchParams } = new URL(_req.url)
    const forceRefresh = searchParams.get('refresh') === 'true'

    // A. Check in-memory cache for instant loads
    const now = Date.now()
    const cached = getCachedOrders()
    const expiresAt = getCacheExpiresAt()
    if (!forceRefresh && cached && now < expiresAt) {
      return NextResponse.json(
        { orders: cached },
        { status: 200 },
      )
    }

    // B. Fetch Shopify and Shiprocket concurrently in parallel with deduplication!
    let promise = getActiveFetchPromise()
    if (!promise) {
      promise = Promise.all([
        fetchAllShopifyOrders(),
        getAllShiprocketOrders()
      ]).then(([shopify, shiprocket]) => {
        setActiveFetchPromise(null) // Reset when completed
        return { shopifyOrders: shopify, shiprocketOrders: shiprocket }
      }).catch((err) => {
        setActiveFetchPromise(null) // Reset on error so future requests can retry
        throw err
      })
      setActiveFetchPromise(promise)
    }

    const { shopifyOrders, shiprocketOrders } = await promise

    // C. Map Shopify orders for rapid deduplication lookup
    const shopifyMap = new Map<string, any>()
    shopifyOrders.forEach((order) => {
      if (order.name) {
        const cleanName = order.name.replace(/^#/, '').trim().toLowerCase()
        shopifyMap.set(cleanName, order)
      }
      if (order.id) {
        shopifyMap.set(String(order.id), order)
      }
    })

    // D. Match Shiprocket orders to enrich matched Shopify orders and extract custom ones
    const customOrders: any[] = []

    shiprocketOrders.forEach((srOrder) => {
      const cleanSrName = String(srOrder.channel_order_id || '').replace(/^#/, '').trim().toLowerCase()
      const matchedShopify = shopifyMap.get(cleanSrName)

      const latestShipment = srOrder.shipments?.[0]
      const tracking_number = latestShipment?.awb || srOrder.last_mile_awb || null
      const tracking_company = latestShipment?.courier || srOrder.last_mile_courier_name || null
      const tracking_url = srOrder.last_mile_awb_track_url || null

      const srStatus = (srOrder.status || '').toLowerCase()
      let shipment_status = null
      if (srStatus.includes('rto') || srStatus.includes('returned')) {
        shipment_status = 'rto'
      } else if (srStatus.includes('undelivered') || srStatus.includes('fail') || srStatus.includes('error')) {
        shipment_status = 'failure'
      } else if (srStatus.includes('delivered')) {
        shipment_status = 'delivered'
      } else if (srStatus.includes('transit') || srStatus.includes('out for delivery')) {
        shipment_status = 'in_transit'
      } else if (srStatus.includes('pickup') || srStatus.includes('scheduled')) {
        shipment_status = 'pickup_scheduled'
      }

      if (matchedShopify) {
        // Enforce matched Shopify order enrichment with Shiprocket tracking info
        if (tracking_number) {
          const enrichmentFulfillment = {
            id: latestShipment?.id || Math.floor(Math.random() * 10000),
            status: 'success',
            tracking_number,
            tracking_company,
            tracking_url,
            shipment_status,
            created_at: srOrder.updated_at || srOrder.created_at || matchedShopify.created_at,
          }
          matchedShopify.fulfillment_status = 'fulfilled'
          matchedShopify.fulfillments = [enrichmentFulfillment]
        }
      } else {
        // Construct a manual/custom order record matching the ShopifyOrder interface
        const isCod = (srOrder.payment_method || '').toLowerCase() === 'cod'
        const financial_status = isCod ? 'pending' : 'paid'

        const enrichFulfillment = tracking_number ? [{
          id: latestShipment?.id || Math.floor(Math.random() * 10000),
          status: 'success',
          tracking_number,
          tracking_company,
          tracking_url,
          shipment_status,
          created_at: srOrder.updated_at || srOrder.created_at,
        }] : []

        const formattedCustomOrder = {
          id: srOrder.id,
          name: srOrder.channel_order_id ? (srOrder.channel_order_id.startsWith('#') ? srOrder.channel_order_id : '#' + srOrder.channel_order_id) : `#SR-${srOrder.id}`,
          created_at: srOrder.created_at || srOrder.channel_created_at || new Date().toISOString(),
          financial_status,
          fulfillment_status: tracking_number ? 'fulfilled' : null,
          total_price: String(srOrder.total || '0'),
          currency: 'INR',
          customer: {
            first_name: srOrder.customer_name || 'Manual Customer',
            last_name: '',
            email: srOrder.customer_email || '',
            phone: srOrder.customer_phone || '',
          },
          shipping_address: {
            first_name: srOrder.customer_name || 'Manual Customer',
            last_name: '',
            address1: srOrder.customer_address || '',
            address2: srOrder.customer_address_2 || '',
            city: srOrder.customer_city || '',
            province: srOrder.customer_state || '',
            country: srOrder.customer_country || 'India',
            zip: srOrder.customer_pincode || '',
            phone: srOrder.customer_phone || '',
          },
          line_items: (srOrder.products || []).map((p: any) => ({
            id: p.id || Math.floor(Math.random() * 100000),
            title: p.name || 'Custom Product',
            variant_title: null,
            sku: p.channel_sku || p.sku || '',
            quantity: p.quantity || 1,
            price: String(p.price || '0'),
            total_discount: String(p.discount || '0'),
            fulfillment_status: null,
          })),
          fulfillments: enrichFulfillment,
          source: 'shiprocket',
        }

        customOrders.push(formattedCustomOrder)
      }
    })

    const combinedOrders = shopifyOrders.concat(customOrders)

    // Save results into memory cache
    setCachedOrders(combinedOrders, Date.now() + CACHE_TTL_MS)

    return NextResponse.json(
      {
        orders: combinedOrders,
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error('Error fetching Shopify orders:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch Shopify orders',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ids } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No order IDs supplied' }, { status: 400 })
    }

    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const cachedOrder = getCachedOrderById(id)
        const isShiprocket = cachedOrder?.source === 'shiprocket'

        if (isShiprocket) {
          try {
            await cancelShiprocketOrder(Number(id))
          } catch (err: any) {
            console.warn(`Failed to cancel Shiprocket order ${id}:`, err)
          }
          removeOrderFromCache(id)
          return { id, success: true, source: 'shiprocket' }
        }

        // Shopify order
        if (!SHOP_DOMAIN || !ADMIN_TOKEN) {
          throw new Error('Shopify credentials are not configured.')
        }

        // Cancel first (Shopify delete requirement)
        await fetch(`https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/orders/${id}/cancel.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': ADMIN_TOKEN,
          },
        }).catch((err) => {
          console.warn(`Failed to cancel Shopify order ${id}:`, err)
        })

        // Delete
        const deleteRes = await fetch(`https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/orders/${id}.json`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': ADMIN_TOKEN,
          },
        })

        if (!deleteRes.ok) {
          const text = await deleteRes.text().catch(() => '')
          throw new Error(`Shopify delete failed: ${deleteRes.status} ${text}`)
        }

        removeOrderFromCache(id)
        return { id, success: true, source: 'shopify' }
      })
    )

    const summary = results.map((r, index) => {
      if (r.status === 'fulfilled') return r.value
      return { id: ids[index], success: false, error: r.reason?.message || 'Unknown error' }
    })

    return NextResponse.json({ success: true, results: summary }, { status: 200 })
  } catch (error: any) {
    console.error('Error in bulk delete orders:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to bulk delete orders' },
      { status: 500 },
    )
  }
}

