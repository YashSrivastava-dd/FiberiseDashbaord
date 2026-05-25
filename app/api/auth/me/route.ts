import { NextRequest, NextResponse } from 'next/server'
import { decryptSession } from '@/src/services/auth'

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('fiberise_session')?.value

    if (!sessionCookie) {
      return NextResponse.json(
        { authenticated: false, error: 'No active session found.' },
        { status: 200 }, // Avoid throwing 401 directly to make silent frontend state checks seamless
      )
    }

    const session = decryptSession(sessionCookie)
    if (!session) {
      return NextResponse.json(
        { authenticated: false, error: 'Session is invalid or expired.' },
        { status: 200 },
      )
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          email: session.email,
          role: session.role,
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
