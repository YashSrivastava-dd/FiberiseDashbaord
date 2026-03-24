import { NextRequest, NextResponse } from 'next/server'

const WELLNESS_API_BASE_URL = process.env.WELLNESS_API_BASE_URL

const buildEndpoint = (request: NextRequest) => {
  if (!WELLNESS_API_BASE_URL) {
    return null
  }

  const incomingUrl = new URL(request.url)
  const outgoingUrl = new URL('/api/support/tickets', WELLNESS_API_BASE_URL)

  const limit = incomingUrl.searchParams.get('limit')
  const status = incomingUrl.searchParams.get('status')

  if (limit) {
    outgoingUrl.searchParams.set('limit', limit)
  }

  if (status) {
    outgoingUrl.searchParams.set('status', status)
  }

  return outgoingUrl.toString()
}

export async function GET(request: NextRequest) {
  const endpoint = buildEndpoint(request)
  if (!endpoint) {
    return NextResponse.json(
      {
        error: 'WELLNESS_API_BASE_URL is not configured.',
      },
      { status: 500 },
    )
  }

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      cache: 'no-store',
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.error || 'Failed to fetch support tickets.',
          details: data,
        },
        { status: response.status },
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error('Failed to fetch support tickets:', error)

    const message = error?.message || ''
    const sslPacketLengthTooLong = message.includes('ERR_SSL_PACKET_LENGTH_TOO_LONG')
    const hint = sslPacketLengthTooLong
      ? 'This usually means HTTPS was used for a server that only serves HTTP. Check WELLNESS_API_BASE_URL (http vs https + port).'
      : null

    return NextResponse.json(
      {
        error: hint
          ? `Failed to fetch support tickets. ${hint}`
          : 'Failed to fetch support tickets.',
      },
      { status: sslPacketLengthTooLong ? 502 : 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  const endpoint = buildEndpoint(request)
  if (!endpoint) {
    return NextResponse.json(
      {
        error: 'WELLNESS_API_BASE_URL is not configured.',
      },
      { status: 500 },
    )
  }

  try {
    const body = await request.json().catch(() => null)

    if (!body?.id) {
      return NextResponse.json(
        {
          error: 'Field "id" is required in request body.',
        },
        { status: 400 },
      )
    }

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.error || 'Failed to update support ticket.',
          details: data,
        },
        { status: response.status },
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error('Failed to update support ticket:', error)
    const message = error?.message || ''
    const sslPacketLengthTooLong = message.includes('ERR_SSL_PACKET_LENGTH_TOO_LONG')
    const hint = sslPacketLengthTooLong
      ? 'This usually means HTTPS was used for a server that only serves HTTP. Check WELLNESS_API_BASE_URL (http vs https + port).'
      : null

    return NextResponse.json(
      {
        error: hint
          ? `Failed to update support ticket. ${hint}`
          : 'Failed to update support ticket.',
      },
      { status: sslPacketLengthTooLong ? 502 : 500 },
    )
  }
}
