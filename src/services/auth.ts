import crypto from 'crypto'
import admin from 'firebase-admin'
import { getFirebaseAdmin } from '@/src/firebase/firebase.config'

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16

// Hash the environment variable to guarantee exactly 32 bytes for AES-256 key
const SECRET = crypto
  .createHash('sha256')
  .update(process.env.SESSION_SECRET || 'fiberise-dashboard-default-super-secret-key-32-chars')
  .digest()

export interface SessionData {
  email: string
  role: string
  expiresAt: number
}

/**
 * Hash a password using PBKDF2 with SHA-512
 */
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
}

/**
 * Encrypt session data into a stateless token
 */
export function encryptSession(data: SessionData): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET, iv)
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

/**
 * Decrypt session token and validate structure & expiry
 */
export function decryptSession(token: string): SessionData | null {
  try {
    const parts = token.split(':')
    if (parts.length !== 2) return null
    const iv = Buffer.from(parts[0], 'hex')
    const encryptedText = Buffer.from(parts[1], 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET, iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    
    const session = JSON.parse(decrypted.toString()) as SessionData
    if (Date.now() > session.expiresAt) {
      return null // Expired
    }
    return session
  } catch (err) {
    return null
  }
}

/**
 * Self-seeding helper to ensure the default admin user exists in Firestore
 */
export async function seedAdminUser(): Promise<void> {
  try {
    const app = getFirebaseAdmin()
    const db = admin.firestore(app)
    const usersCol = db.collection('users')
    
    const adminEmail = 'admin@fiberisefit.com'
    const query = await usersCol.where('email', '==', adminEmail).limit(1).get()
    
    if (query.empty) {
      console.log(`🌱 Seeding default admin user: ${adminEmail}`)
      
      const salt = crypto.randomBytes(16).toString('hex')
      const passwordHash = hashPassword('admin@1234', salt)
      
      await usersCol.add({
        email: adminEmail,
        salt,
        passwordHash,
        role: 'admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
      
      console.log('✅ Default admin user seeded successfully')
    }
  } catch (error) {
    console.error('❌ Failed to seed default admin user:', error)
  }
}
