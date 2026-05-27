import { NextRequest, NextResponse } from 'next/server'
import { createShiprocketAdhocOrder } from '@/src/services/shiprocketClient'
import { storePhone, storePhoneByChannel } from '@/src/services/phoneStore'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)

    if (!body?.order_id || !body?.pickup_location || !body?.order_items?.length) {
      return NextResponse.json(
        {
          error:
            'Missing required fields. Required: order_id, pickup_location, order_items (non-empty).',
        },
        { status: 400 },
      )
    }

    const data = await createShiprocketAdhocOrder(body)
    if (data.status_code === 0) {
      return NextResponse.json(
        { error: data.message || 'Shiprocket order creation failed', details: data },
        { status: 400 }
      )
    }

    // Success! Update the server-side memory cache with the new Shiprocket order
    try {
      const { addOrderToCache } = require('@/src/services/ordersCache')
      
      const srPhone = body.billing_phone || ''
      const isCod = (body.payment_method || '').toLowerCase() === 'cod'
      
      const formattedCustomOrder = {
        id: data.order_id || Math.floor(1000000 + Math.random() * 9000000),
        name: body.order_id ? (body.order_id.startsWith('#') ? body.order_id : '#' + body.order_id) : `#SR-${data.order_id}`,
        created_at: body.order_date ? new Date(body.order_date).toISOString() : new Date().toISOString(),
        financial_status: isCod ? 'pending' : 'paid',
        cancelled_at: null,
        fulfillment_status: null,
        total_price: String(body.sub_total || '0'),
        currency: 'INR',
        customer: {
          first_name: body.billing_customer_name || 'Manual Customer',
          last_name: body.billing_last_name || '',
          email: body.billing_email || '',
          phone: srPhone,
        },
        shipping_address: {
          first_name: body.billing_customer_name || 'Manual Customer',
          last_name: body.billing_last_name || '',
          address1: body.billing_address || '',
          address2: body.billing_address_2 || '',
          city: body.billing_city || '',
          province: body.billing_state || '',
          country: body.billing_country || 'India',
          zip: String(body.billing_pincode || ''),
          phone: srPhone,
        },
        line_items: (body.order_items || []).map((p: any) => ({
          id: p.id || Math.floor(Math.random() * 100000),
          title: p.name || 'Custom Product',
          variant_title: null,
          sku: p.sku || '',
          quantity: p.units || 1,
          price: String(p.selling_price || '0'),
          total_discount: '0',
          fulfillment_status: null,
        })),
        fulfillments: [],
        source: 'shiprocket',
      }

      addOrderToCache(formattedCustomOrder)

      // Persist the phone to disk so it survives restarts & Shiprocket API masking
      storePhone(formattedCustomOrder.id, srPhone)
      storePhoneByChannel(body.order_id || '', srPhone)
    } catch (e) {
      console.error('⚠️ Failed to add cloned order to cache:', e)
    }

    // Return order data to the client, including the sanitized phone for UI use
    return NextResponse.json({ ...data, billing_phone: body.billing_phone || '' }, { status: 200 })
  } catch (error: any) {
    console.error('Error creating Shiprocket adhoc order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create Shiprocket adhoc order' },
      { status: 500 },
    )
  }
}
