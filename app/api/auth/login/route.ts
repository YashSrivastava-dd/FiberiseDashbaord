export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { getFirebaseAdmin } from '@/src/firebase/firebase.config'
import { hashPassword, encryptSession, seedAdminUser } from '@/src/services/auth'

export async function POST(req: NextRequest) {
  try {
    // 1. Ensure the default admin user is seeded
    await seedAdminUser()

    const body = await req.json().catch(() => null)
    if (!body?.email || !body?.password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 },
      )
    }

    const email = String(body.email).toLowerCase().trim()
    const password = String(body.password)

    // 2. Fetch the user doc from Firestore
    const app = getFirebaseAdmin()
    const db = admin.firestore(app)
    const query = await db.collection('users').where('email', '==', email).limit(1).get()

    if (query.empty) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 },
      )
    }

    const userDoc = query.docs[0]
    const userData = userDoc.data()

    // 3. Hash input password with saved salt and verify
    const computedHash = hashPassword(password, userData.salt)
    if (computedHash !== userData.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 },
      )
    }

    // 4. Session payload
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    const tokenPayload = {
      email: userData.email,
      role: userData.role || 'user',
      expiresAt,
    }

    const encryptedToken = encryptSession(tokenPayload)

    // 5. Build response and assign HTTP-only cookie
    const res = NextResponse.json(
      {
        success: true,
        user: { email: userData.email, role: userData.role },
      },
      { status: 200 },
    )

    res.cookies.set('fiberise_session', encryptedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
    })

    return res
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to authenticate user.' },
      { status: 500 },
    )
  }
}
