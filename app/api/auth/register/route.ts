export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import admin from 'firebase-admin'
import { getFirebaseAdmin } from '@/src/firebase/firebase.config'
import { hashPassword, decryptSession } from '@/src/services/auth'

export async function POST(req: NextRequest) {
  try {
    // Optional: Protect the endpoint so only admins can register new users
    const sessionCookie = req.cookies.get('fiberise_session')?.value
    if (sessionCookie) {
      const session = decryptSession(sessionCookie)
      if (session && session.role !== 'admin') {
        return NextResponse.json(
          { error: 'Unauthorized. Only admins can register new users.' },
          { status: 403 }
        )
      }
    }

    const body = await req.json().catch(() => null)
    if (!body?.email || !body?.password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      )
    }

    const email = String(body.email).toLowerCase().trim()
    const password = String(body.password)
    const role = String(body.role || 'employee').toLowerCase().trim()

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      )
    }

    const app = getFirebaseAdmin()
    const db = admin.firestore(app)
    const usersCol = db.collection('users')

    // Check if user already exists
    const query = await usersCol.where('email', '==', email).limit(1).get()
    if (!query.empty) {
      return NextResponse.json(
        { error: 'User with this email already exists.' },
        { status: 409 }
      )
    }

    // Hash the password with a unique salt
    const salt = crypto.randomBytes(16).toString('hex')
    const passwordHash = hashPassword(password, salt)

    // Save the new user document
    const docRef = await usersCol.add({
      email,
      salt,
      passwordHash,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })

    return NextResponse.json(
      {
        success: true,
        message: `User ${email} registered successfully with role '${role}'.`,
        userId: docRef.id
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to register user.' },
      { status: 500 }
    )
  }
}
