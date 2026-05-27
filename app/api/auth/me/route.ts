export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { decryptSession, validateSession } from '@/src/services/auth'

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('fiberise_session')?.value

    if (!sessionCookie) {
      return NextResponse.json(
        { authenticated: false, error: 'No active session found.' },
        { status: 200 },
      )
    }

    const session = decryptSession(sessionCookie)
    if (!session) {
      const res = NextResponse.json(
        { authenticated: false, error: 'Session is invalid or expired.' },
        { status: 200 },
      )
      res.cookies.delete('fiberise_session')
      return res
    }

    // Perform database concurrency check
    const isValid = await validateSession(session)
    if (!isValid) {
      console.warn(`⚠️ [Session Kickout] Session for ${session.email} invalidated due to a newer concurrent login.`)
      const res = NextResponse.json(
        { authenticated: false, error: 'Session invalidated: Another login was detected on a different device.' },
        { status: 200 },
      )
      
      // Clear session cookie
      const protocol = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol
      const isHttps = protocol.includes('https')
      res.cookies.set('fiberise_session', '', {
        httpOnly: true,
        secure: isHttps,
        sameSite: 'lax',
        path: '/',
        expires: new Date(0),
      })
      return res
    }

    // Dynamic client IP extraction
    let ipAddress = '127.0.0.1'
    const xForwardedFor = req.headers.get('x-forwarded-for')
    if (xForwardedFor) {
      ipAddress = xForwardedFor.split(',')[0].trim()
    } else {
      ipAddress = (req as any).ip || '127.0.0.1'
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          email: session.email,
          role: session.role,
          ipAddress,
        },
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error('Session verification error:', error)
    return NextResponse.json(
      { authenticated: false, error: 'Internal server error verifying session.' },
      { status: 500 },
    )
  }
}
