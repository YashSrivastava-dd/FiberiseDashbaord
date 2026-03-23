import { NextRequest, NextResponse } from 'next/server'
import {
  findShiprocketOrderByChannelNumber,
  getShiprocketInvoices,
} from '@/src/services/shiprocketClient'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    // Accept either:
    //   { orderNames: ["#1021", "#1022"] }  ← Shopify order names (preferred)
    //   { orderIds: [123456] }              ← Shiprocket order IDs directly
    const { orderNames, orderIds } = body as {
      orderNames?: string[]
      orderIds?: number[]
    }

    let shiprocketIds: number[] = []

    if (orderIds && orderIds.length > 0) {
      shiprocketIds = orderIds
    } else if (orderNames && orderNames.length > 0) {
      const results = await Promise.all(
        orderNames.map((name) => findShiprocketOrderByChannelNumber(name)),
      )
      shiprocketIds = results
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .map((r) => r.id)

      if (shiprocketIds.length === 0) {
        return NextResponse.json(
          { error: 'No matching Shiprocket orders found for the provided order names.' },
          { status: 404 },
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Provide orderNames (Shopify order names) or orderIds (Shiprocket order IDs).' },
        { status: 400 },
      )
    }

    const data = await getShiprocketInvoices(shiprocketIds)

    // Check if any orders failed (e.g. incomplete, no AWB)
    const notCreated = data?.not_created
    if (notCreated && typeof notCreated === 'object' && Object.keys(notCreated).length > 0) {
      const firstFailed = Object.values(notCreated as Record<string, any>)[0] as any
      const reason = firstFailed?.message || 'Order is incomplete'
      const awb = firstFailed?.awb

      if (!awb) {
        return NextResponse.json(
          {
            error: `Cannot print invoice: "${reason}". The order has no AWB assigned yet — please assign a courier in Shiprocket first.`,
          },
          { status: 422 },
        )
      }
    }

    const invoiceUrl =
      data?.invoice_url ??
      (typeof data?.data === 'string' ? data.data : undefined)

    if (!invoiceUrl) {
      return NextResponse.json(
        { error: 'Invoice could not be generated. The order may not have a courier assigned in Shiprocket yet.', raw: data },
        { status: 502 },
      )
    }

    return NextResponse.json({ invoiceUrl })
  } catch (error: any) {
    console.error('Error fetching Shiprocket invoices:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Shiprocket invoices' },
      { status: 500 },
    )
  }
}
