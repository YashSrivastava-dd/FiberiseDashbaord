import { NextRequest, NextResponse } from 'next/server'
import {
  findShiprocketOrderByChannelNumber,
  getShiprocketManifest,
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

    const data = await getShiprocketManifest(shiprocketShipmentIds)

    console.log('Shiprocket manifest response:', JSON.stringify(data, null, 2))

    // Shiprocket can return the URL under several different keys — cover all of them
    const manifestUrl =
      data?.manifest_url ??
      data?.url ??
      data?.print_url ??
      (typeof data?.data === 'string' ? data.data : undefined)

    if (!manifestUrl) {
      const msg =
        data?.message ??
        (data?.not_created ? `Not created: ${JSON.stringify(data.not_created)}` : null) ??
        'Manifest not generated — check server logs for raw Shiprocket response'
      return NextResponse.json({ error: msg, raw: data }, { status: 502 })
    }

    return NextResponse.json({ manifestUrl })
  } catch (error: any) {
    console.error('Error fetching Shiprocket manifest:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Shiprocket manifest' },
      { status: 500 },
    )
  }
}
