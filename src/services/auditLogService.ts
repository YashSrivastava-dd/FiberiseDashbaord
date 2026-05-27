import admin from 'firebase-admin';
import { getFirebaseAdmin } from '@/src/firebase/firebase.config';
import { NextRequest } from 'next/server';

export interface AuditLogEntry {
  id?: string;
  userId: string;
  userEmail: string;
  actionType: string;
  details: any;
  timestamp: admin.firestore.Timestamp | any;
  ipAddress?: string;
  userAgent?: string;
}

function getDb() {
  const app = getFirebaseAdmin();
  return admin.firestore(app);
}

/**
 * Log a new action performed by an employee or admin.
 * Stored in the non-deletable 'action_logs' collection.
 */
export async function logAction(
  userId: string,
  userEmail: string,
  actionType: string,
  details: any,
  req?: NextRequest | Request
): Promise<string | null> {
  try {
    const db = getDb();
    
    // Extract IP and User-Agent if request object is provided
    let ipAddress = 'N/A';
    let userAgent = 'N/A';
    
    if (req) {
      // Get IP Address
      const xForwardedFor = req.headers.get('x-forwarded-for');
      if (xForwardedFor) {
        ipAddress = xForwardedFor.split(',')[0].trim();
      } else {
        ipAddress = (req as any).ip || 'N/A';
      }
      
      // Get User Agent
      userAgent = req.headers.get('user-agent') || 'N/A';
    }

    const logEntry: Omit<AuditLogEntry, 'id'> = {
      userId: userId || 'system',
      userEmail: userEmail || 'system@fiberisefit.com',
      actionType,
      details: details || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress,
      userAgent
    };

    const docRef = await db.collection('action_logs').add(logEntry);
    console.log(`🔒 [Audit Log] Saved action '${actionType}' for ${userEmail} (ID: ${docRef.id})`);
    return docRef.id;
  } catch (error) {
    console.error('⚠️ [Audit Log] Failed to save action log to Firestore:', error);
    return null;
  }
}

/**
 * Fetch all action logs from the 'action_logs' collection, ordered by timestamp desc.
 */
export async function getActionLogs(limitCount = 100): Promise<(AuditLogEntry & { id: string })[]> {
  try {
    const db = getDb();
    const snapshot = await db.collection('action_logs')
      .orderBy('timestamp', 'desc')
      .limit(limitCount)
      .get();
      
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as AuditLogEntry & { id: string };
    });
  } catch (error) {
    console.error('⚠️ [Audit Log] Failed to retrieve action logs from Firestore:', error);
    return [];
  }
}
