export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { decryptSession, validateSession } from '@/src/services/auth'

function formatToIPv4(ip: string): string {
  if (!ip || ip === 'N/A') return '127.0.0.1'
  let cleanIp = ip.trim()

  // Handle brackets (commonly surrounding IPv6 addresses in URLs, e.g. [::1]:3000)
  if (cleanIp.startsWith('[') && cleanIp.includes(']')) {
    const endBracket = cleanIp.indexOf(']')
    cleanIp = cleanIp.substring(1, endBracket)
  } else {
    // If it's IPv4 or standard IP, strip port if there is one colon
    const colonCount = (cleanIp.match(/:/g) || []).length
    if (colonCount === 1) {
      cleanIp = cleanIp.split(':')[0]
    }
  }

  // Handle loopbacks
  if (cleanIp === '::1' || cleanIp === '::') {
    return '127.0.0.1'
  }

  // Handle IPv6 mapped IPv4 format
  if (cleanIp.startsWith('::ffff:')) {
    return cleanIp.substring(7)
  }

  return cleanIp
}

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
    ipAddress = formatToIPv4(ipAddress)

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
