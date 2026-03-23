import { NextRequest, NextResponse } from 'next/server'

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
