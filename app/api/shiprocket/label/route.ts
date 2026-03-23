import { NextRequest, NextResponse } from 'next/server'
import {
  findShiprocketOrderByChannelNumber,
  generateShiprocketLabels,
} from '@/src/services/shiprocketClient'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    const { orderNames, shipmentIds } = body as {
      orderNames?: string[]
      shipmentIds?: number[]
    }

    let shiprocketShipmentIds: number[] = []

    if (shipmentIds && shipmentIds.length > 0) {
      shiprocketShipmentIds = shipmentIds
    } else if (orderNames && orderNames.length > 0) {
      const results = await Promise.all(
        orderNames.map((name) => findShiprocketOrderByChannelNumber(name)),
      )
      shiprocketShipmentIds = results
        .filter((r): r is NonNullable<typeof r> => r !== null && r.shipment_id !== null)
        .map((r) => r.shipment_id as number)

      if (shiprocketShipmentIds.length === 0) {
        return NextResponse.json(
          { error: 'No matching Shiprocket shipments found for the provided order names.' },
          { status: 404 },
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Provide orderNames (Shopify order names) or shipmentIds (Shiprocket shipment IDs).' },
        { status: 400 },
      )
    }

    const data = await generateShiprocketLabels(shiprocketShipmentIds)

    console.log('Shiprocket label response:', JSON.stringify(data, null, 2))

    // Shiprocket can return the URL under several different keys — cover all of them
    const labelUrl =
      data?.label_url ??
      data?.response?.label_url ??
      data?.print_url ??
      data?.url ??
      (typeof data?.data === 'string' ? data.data : undefined)

    if (!labelUrl) {
      // Surface the full raw response so the error message is useful
      const msg =
        data?.message ??
        (data?.not_created ? `Not created: ${JSON.stringify(data.not_created)}` : null) ??
        'Label not generated — check server logs for raw Shiprocket response'
      return NextResponse.json({ error: msg, raw: data }, { status: 502 })
    }

    return NextResponse.json({ labelUrl })
  } catch (error: any) {
    console.error('Error generating Shiprocket labels:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate Shiprocket labels' },
      { status: 500 },
    )
  }
}
