import { getMessaging } from '../firebase/firebase.config';
import { tokenService } from './tokenService';
import { getFirestoreFcmTokenStrings } from './firestoreTokenService';
import admin from 'firebase-admin';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface SendNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BroadcastResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: Array<{ token: string; error: string }>;
}

export class NotificationService {
  /**
   * Send notification to a single FCM token
   */
  async sendToToken(
    token: string,
    payload: NotificationPayload
  ): Promise<SendNotificationResult> {
    try {
      const messaging = getMessaging();

      // Convert data values to strings (FCM requirement)
      const data: Record<string, string> = {};
      if (payload.data) {
        Object.entries(payload.data).forEach(([key, value]) => {
          data[key] = String(value);
        });
      }

      const message: admin.messaging.Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: Object.keys(data).length > 0 ? data : undefined,
      };

      const messageId = await messaging.send(message);

      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      console.error('Error sending notification:', error);
      return {
        success: false,
        error: error.message || 'Failed to send notification',
      };
    }
  }

  /**
   * Broadcast notification to all registered tokens
   * @param payload Notification payload
   * @param useFirestore If true, fetches tokens from Firestore instead of MongoDB
   */
  async broadcastToAll(
    payload: NotificationPayload,
    useFirestore: boolean = false
  ): Promise<BroadcastResult> {
    try {
      // Get tokens from either Firestore or MongoDB
      let tokens: string[];
      
      if (useFirestore) {
        tokens = await getFirestoreFcmTokenStrings();
      } else {
        tokens = await tokenService.getAllTokens();
      }

      if (tokens.length === 0) {
        return {
          success: true,
          sent: 0,
          failed: 0,
          errors: [],
        };
      }

      const messaging = getMessaging();

      // Convert data values to strings (FCM requirement)
      const data: Record<string, string> = {};
      if (payload.data) {
        Object.entries(payload.data).forEach(([key, value]) => {
          data[key] = String(value);
        });
      }

      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: Object.keys(data).length > 0 ? data : undefined,
      };

      const response = await messaging.sendEachForMulticast(message);

      const errors: Array<{ token: string; error: string }> = [];
      let failedCount = 0;

      // Process failures
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedCount++;
            errors.push({
              token: tokens[idx],
              error: resp.error?.message || 'Unknown error',
            });
          }
        });
      }

      return {
        success: response.successCount > 0 || response.failureCount === 0,
        sent: response.successCount,
        failed: failedCount,
        errors,
      };
    } catch (error: any) {
      console.error('Error broadcasting notification:', error);
      return {
        success: false,
        sent: 0,
        failed: 0,
        errors: [{ token: 'all', error: error.message || 'Failed to broadcast' }],
      };
    }
  }
}

export const notificationService = new NotificationService();
