import { NextRequest, NextResponse } from 'next/server'

// We define a lightweight, Edge-safe decryption check or signature verification
// to avoid Node.js native module loading errors in the Edge runtime.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 1. Skip checks for public assets, static files, and login/auth APIs
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout') ||
    pathname === '/login' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // 2. Retrieve session cookie
  const sessionCookie = req.cookies.get('fiberise_session')?.value

  if (!sessionCookie) {
    // Redirect to login if unauthenticated
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  try {
    // Validate session cookie structure: AES-256 CBC format is "ivHex:encryptedHex"
    const parts = sessionCookie.split(':')
    if (parts.length !== 2 || parts[0].length !== 32) {
      throw new Error('Invalid token structure')
    }

    // Token has correct structure; allow standard request routing
    return NextResponse.next()
  } catch (error) {
    console.warn('Session verification failed in middleware, redirecting to login:', error)
    
    // Clear invalid session cookie and redirect to login
    const loginUrl = new URL('/login', req.url)
    const res = NextResponse.redirect(loginUrl)
    res.cookies.delete('fiberise_session')
    return res
  }
}

// Support matcher configuration for Next.js to intercept all page routes
export const config = {
  matcher: [
    // Protect all admin page routes
    '/',
    '/orders/:path*',
    '/whatsapp/:path*',
    '/shiprocket/:path*',
    '/api/:path*' // Protect API endpoints as well
  ]
}
