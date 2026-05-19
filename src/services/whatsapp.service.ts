/**
 * WhatsApp Service — AiSensy Integration
 *
 * Reusable service for sending WhatsApp template messages via AiSensy Campaign API.
 * Handles:
 *  - Dynamic template parameters
 *  - Media attachments (images, documents)
 *  - CTA buttons
 *  - Phone number normalization (Indian numbers)
 *  - Exponential backoff retry (3 attempts)
 *  - Firestore message logging
 *
 * AiSensy API: POST https://backend.aisensy.com/campaign/t1/api/v2
 */

import axios, { AxiosError } from 'axios';
import { getFirebaseAdmin } from '@/src/firebase/firebase.config';
import admin from 'firebase-admin';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SendWhatsAppTemplateParams {
  /** Recipient phone number (any format — will be normalized) */
  phone: string;
  /** AiSensy-approved template name */
  templateName: string;
  /** AiSensy campaign name (must be set to "Live" in AiSensy dashboard) */
  campaignName?: string;
  /** Ordered array of template variable values: ["John", "₹999", "ORD-123"] */
  params?: string[];
  /** Public URL for media (image/video/document) if template has media header */
  mediaUrl?: string;
  /** Media filename (used for document type media) */
  mediaFilename?: string;
  /** Recipient display name */
  userName?: string;
  /** Lead source tag */
  source?: string;
  /** Optional journey ID for tracking */
  journeyId?: string;
  /** Optional customer ID for tracking */
  customerId?: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  response?: any;
  error?: string;
  attempts: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1s, 2s, 4s exponential backoff

// ─── Phone Normalization ──────────────────────────────────────────────────────

/**
 * Normalize phone numbers to international format with country code.
 * Handles Indian numbers by default:
 *  - "9876543210"    → "+919876543210"
 *  - "919876543210"  → "+919876543210"
 *  - "+919876543210" → "+919876543210"
 *  - "09876543210"   → "+919876543210"
 */
export function normalizePhoneNumber(phone: string): string {
  // Strip all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Remove leading + for processing
  const hasPlus = cleaned.startsWith('+');
  if (hasPlus) cleaned = cleaned.substring(1);

  // Remove leading 0 (Indian local format)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // If 10 digits, assume Indian — prepend 91
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }

  // If 12 digits starting with 91, it's already correct
  // Add + prefix
  return '+' + cleaned;
}

// ─── Core Send Function ───────────────────────────────────────────────────────

/**
 * Send a WhatsApp template message via AiSensy Campaign API.
 * Retries up to MAX_RETRIES times with exponential backoff.
 * Logs every attempt to Firestore `message_logs` collection.
 */
export async function sendWhatsAppTemplate(
  params: SendWhatsAppTemplateParams
): Promise<WhatsAppSendResult> {
  const apiKey = process.env.AISENSY_API_KEY;
  const baseUrl = process.env.AISENSY_BASE_URL || 'https://backend.aisensy.com/campaign/t1/api/v2';
  const defaultCampaignName = process.env.AISENSY_CAMPAIGN_NAME || '';

  if (!apiKey) {
    const errorMsg = 'AISENSY_API_KEY is not configured in environment variables';
    console.error(`❌ WhatsApp Service: ${errorMsg}`);
    await logMessageToFirestore({
      customerId: params.customerId || '',
      journeyId: params.journeyId || '',
      phone: params.phone,
      templateName: params.templateName,
      status: 'failed',
      error: errorMsg,
      response: null,
    });
    return { success: false, error: errorMsg, attempts: 0 };
  }

  const normalizedPhone = normalizePhoneNumber(params.phone);
  const campaignName = params.campaignName || defaultCampaignName;

  // Build AiSensy API payload
  const payload: Record<string, any> = {
    apiKey,
    campaignName,
    destination: normalizedPhone,
    userName: params.userName || 'Customer',
    templateParams: params.params || [],
  };

  // Add optional media
  if (params.mediaUrl) {
    payload.media = {
      url: params.mediaUrl,
      filename: params.mediaFilename || 'media',
    };
  }

  // Add source if provided
  if (params.source) {
    payload.source = params.source;
  }

  // ── Retry loop with exponential backoff ──
  let lastError: string = '';
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `📤 WhatsApp Send [Attempt ${attempt}/${MAX_RETRIES}]: ${params.templateName} → ${normalizedPhone}`
      );

      const response = await axios.post(baseUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000, // 15s timeout
      });

      console.log(
        `✅ WhatsApp Sent: ${params.templateName} → ${normalizedPhone} (attempt ${attempt})`
      );

      // Log success to Firestore
      await logMessageToFirestore({
        customerId: params.customerId || '',
        journeyId: params.journeyId || '',
        phone: normalizedPhone,
        templateName: params.templateName,
        status: 'sent',
        error: null,
        response: response.data,
      });

      return {
        success: true,
        response: response.data,
        attempts: attempt,
      };
    } catch (error) {
      const axiosErr = error as AxiosError;
      lastError =
        axiosErr.response?.data
          ? JSON.stringify(axiosErr.response.data)
          : axiosErr.message || 'Unknown error';

      console.error(
        `❌ WhatsApp Send Failed [Attempt ${attempt}/${MAX_RETRIES}]: ${lastError}`
      );

      // Don't retry on 4xx client errors (bad request, unauthorized, etc.)
      if (axiosErr.response && axiosErr.response.status >= 400 && axiosErr.response.status < 500) {
        console.error(`🚫 Client error (${axiosErr.response.status}) — not retrying`);
        break;
      }

      // Exponential backoff before next retry
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted — log failure
  await logMessageToFirestore({
    customerId: params.customerId || '',
    journeyId: params.journeyId || '',
    phone: normalizedPhone,
    templateName: params.templateName,
    status: 'failed',
    error: lastError,
    response: null,
  });

  return {
    success: false,
    error: lastError,
    attempts: MAX_RETRIES,
  };
}

// ─── Firestore Logging ────────────────────────────────────────────────────────

interface MessageLogEntry {
  customerId: string;
  journeyId: string;
  phone: string;
  templateName: string;
  status: 'sent' | 'failed' | 'pending';
  error: string | null;
  response: any;
}

/**
 * Log a WhatsApp message send attempt to the Firestore `message_logs` collection.
 */
async function logMessageToFirestore(entry: MessageLogEntry): Promise<void> {
  try {
    const app = getFirebaseAdmin();
    const db = admin.firestore(app);

    await db.collection('message_logs').add({
      customerId: entry.customerId,
      journeyId: entry.journeyId,
      phone: entry.phone,
      templateName: entry.templateName,
      status: entry.status,
      error: entry.error || null,
      response: entry.response ? JSON.stringify(entry.response) : null,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (logError) {
    // Don't let logging failure break the main flow
    console.error('⚠️ Failed to log message to Firestore:', logError);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
