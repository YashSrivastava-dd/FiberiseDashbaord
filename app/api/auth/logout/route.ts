export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(_req: NextRequest) {
  try {
    const res = NextResponse.json({ success: true }, { status: 200 })

    const protocol = _req.headers.get('x-forwarded-proto') || _req.nextUrl.protocol
    const isHttps = protocol.includes('https')

    res.cookies.set('fiberise_session', '', {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      expires: new Date(0), // Instantly expire the cookie
    })

    return res
  } catch (error: any) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to logout session.' },
      { status: 500 },
    )
  }
}
export async function GET(req: NextRequest) {
  // Support GET redirect or plain GET logouts
  return POST(req)
}
