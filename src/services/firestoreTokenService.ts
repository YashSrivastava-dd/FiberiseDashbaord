import { getFirebaseAdmin } from '../firebase/firebase.config'
import admin from 'firebase-admin'

export interface FirestoreTokenInfo {
  userId: string
  token: string
  userName?: string
}

/**
 * Fetch FCM tokens from Firestore user documents using Firebase Admin SDK
 * Checks multiple possible field names for FCM tokens
 */
export async function getFirestoreFcmTokens(): Promise<FirestoreTokenInfo[]> {
  try {
    const adminApp = getFirebaseAdmin()
    const db = admin.firestore(adminApp)
    
    // Get all users from Firestore
    const usersSnapshot = await db.collection('users').get()
    
    if (usersSnapshot.empty) {
      return []
    }

    const tokens: FirestoreTokenInfo[] = []

    usersSnapshot.forEach((doc) => {
      const user = { id: doc.id, ...doc.data() }
      
      // Check multiple possible field names for FCM token
      const possibleFields = [
        'fcmToken',
        'pushToken',
        'notificationToken',
        'fcm_token',
        'push_token',
        'deviceToken',
        'fcm',
        'token',
      ]

      for (const field of possibleFields) {
        const tokenValue = user[field]
        if (tokenValue && typeof tokenValue === 'string' && tokenValue.trim() !== '') {
          tokens.push({
            userId: user.id || user.phone || '',
            token: tokenValue,
            userName: user.name || user.email || user.phone || 'Unknown User',
          })
          break // Found token, move to next user
        }
      }
    })

    return tokens
  } catch (error: any) {
    console.error('Error fetching FCM tokens from Firestore:', error)
    throw error
  }
}

/**
 * Get FCM token strings array from Firestore
 */
export async function getFirestoreFcmTokenStrings(): Promise<string[]> {
  const tokens = await getFirestoreFcmTokens()
  return tokens.map((t) => t.token)
}
