import { NextRequest, NextResponse } from 'next/server'

const WELLNESS_API_BASE_URL = process.env.WELLNESS_API_BASE_URL

const getEndpoint = (request: NextRequest, id: string) => {
  if (!WELLNESS_API_BASE_URL) {
    return null
  }

  const incomingUrl = new URL(request.url)
  const outgoingUrl = new URL(`/api/support/tickets/${id}/comments`, WELLNESS_API_BASE_URL)

  const limit = incomingUrl.searchParams.get('limit')
  if (limit) {
    outgoingUrl.searchParams.set('limit', limit)
  }

  return outgoingUrl.toString()
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const endpoint = getEndpoint(request, id)

  if (!endpoint) {
    return NextResponse.json({ error: 'WELLNESS_API_BASE_URL is not configured.' }, { status: 500 })
  }

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      cache: 'no-store',
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to fetch ticket comments.', details: data },
        { status: response.status },
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error('Failed to fetch ticket comments:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ticket comments.' },
      { status: 500 },
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const endpoint = getEndpoint(request, id)

  if (!endpoint) {
    return NextResponse.json({ error: 'WELLNESS_API_BASE_URL is not configured.' }, { status: 500 })
  }

  try {
    const body = await request.json().catch(() => null)

    if (!body?.message || !body?.authorType) {
      return NextResponse.json(
        { error: 'Fields "message" and "authorType" are required.' },
        { status: 400 },
      )
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to post ticket comment.', details: data },
        { status: response.status },
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error('Failed to post ticket comment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to post ticket comment.' },
      { status: 500 },
    )
  }
}
