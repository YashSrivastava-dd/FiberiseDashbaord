import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('id') // Shiprocket internal order ID
  const channelId = searchParams.get('channel_id') // e.g. "1128-C"

  const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL
  const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD

  if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
    return NextResponse.json({ error: 'Shiprocket credentials not configured' }, { status: 500 })
  }

  try {
    // Get auth token
    const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: SHIPROCKET_EMAIL, password: SHIPROCKET_PASSWORD }),
    })
    const authData = await authRes.json()
    const token = authData.token

    // Fetch the order list filtered by channel_order_id if provided
    const url = channelId
      ? `https://apiv2.shiprocket.in/v1/external/orders?channel_order_id=${encodeURIComponent(channelId)}`
      : orderId
      ? `https://apiv2.shiprocket.in/v1/external/orders/${orderId}`
      : `https://apiv2.shiprocket.in/v1/external/orders?per_page=1&page=1`

    const orderRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    const orderData = await orderRes.json()

    // Return the raw data so we can inspect every field
    const orders = orderData?.data ?? orderData?.orders ?? (Array.isArray(orderData) ? orderData : [orderData])
    const sampleOrder = orders[0] || orderData

    return NextResponse.json({
      keys: sampleOrder ? Object.keys(sampleOrder) : [],
      phone_fields: {
        billing_phone: sampleOrder?.billing_phone,
        phone: sampleOrder?.phone,
        customer_phone: sampleOrder?.customer_phone,
        billing_customer_phone: sampleOrder?.billing_customer_phone,
        shipping_phone: sampleOrder?.shipping_phone,
        reseller_phone: sampleOrder?.reseller_phone,
        customer_contact: sampleOrder?.customer_contact,
        contact: sampleOrder?.contact,
        billing_address_phone: sampleOrder?.billing_address?.phone,
      },
      full_order: sampleOrder,
      raw: orderData,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
