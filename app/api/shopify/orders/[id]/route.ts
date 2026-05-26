export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cancelShiprocketOrder } from '@/src/services/shiprocketClient'
import { getCachedOrderById, removeOrderFromCache, cancelOrderInCache } from '@/src/services/ordersCache'

const SHOP_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN
const API_VERSION = process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION || '2024-01'
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    if (!SHOP_DOMAIN || !ADMIN_TOKEN) {
      return NextResponse.json(
        { error: 'Shopify credentials are not configured.' },
        { status: 500 },
      )
    }

    const url = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/orders/${id}.json`

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ADMIN_TOKEN,
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json(
        { error: `Shopify API error: ${res.status} ${res.statusText}`, details: text },
        { status: res.status },
      )
    }

    const data = await res.json()
    return NextResponse.json({ order: data.order }, { status: 200 })
  } catch (error: any) {
    console.error('Error fetching Shopify order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    // 1. Identify order source from in-memory cache
    const cachedOrder = getCachedOrderById(id)
    const isShiprocket = cachedOrder?.source === 'shiprocket'

    if (isShiprocket) {
      // Cancel Shiprocket custom order
      try {
        await cancelShiprocketOrder(Number(id))
      } catch (err: any) {
        console.warn('Failed to cancel order directly on Shiprocket:', err)
      }
      
      // Update in memory cache to mark as cancelled
      cancelOrderInCache(id)
      return NextResponse.json({ success: true, message: 'Shiprocket order cancelled successfully' }, { status: 200 })
    }

    // 2. Shopify order cancellation logic
    if (!SHOP_DOMAIN || !ADMIN_TOKEN) {
      return NextResponse.json(
        { error: 'Shopify credentials are not configured.' },
        { status: 500 },
      )
    }

    // Cancel order on Shopify
    const cancelRes = await fetch(`https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/orders/${id}/cancel.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ADMIN_TOKEN,
      },
    })

    if (!cancelRes.ok) {
      const text = await cancelRes.text().catch(() => '')
      // 422 means already cancelled
      if (cancelRes.status !== 422) {
        return NextResponse.json(
          { error: `Shopify cancel error: ${cancelRes.status} ${cancelRes.statusText}`, details: text },
          { status: cancelRes.status },
        )
      }
    }

    // Update in-memory cache to reflect the cancelled status instantly
    cancelOrderInCache(id)

    return NextResponse.json({ success: true, message: 'Shopify order cancelled successfully' }, { status: 200 })
  } catch (error: any) {
    console.error('Error cancelling order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel order' },
      { status: 500 },
    )
  }
}
