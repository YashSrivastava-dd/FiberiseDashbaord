import { NextRequest, NextResponse } from 'next/server'
import { createShiprocketAdhocOrder } from '@/src/services/shiprocketClient'

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
    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error('Error creating Shiprocket adhoc order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create Shiprocket adhoc order' },
      { status: 500 },
    )
  }
}
