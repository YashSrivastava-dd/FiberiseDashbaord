/**
 * WhatsApp Message Logs API
 *
 * GET  /api/whatsapp/logs   — List message logs with filters
 * POST /api/whatsapp/logs   — Retry a failed message
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getMessageLogs, getCustomerById } from '@/src/services/firestore.service';
import { sendWhatsAppTemplate } from '@/src/services/whatsapp.service';
import { getFirebaseAdmin } from '@/src/firebase/firebase.config';
import admin from 'firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const customerId = searchParams.get('customerId') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    const logs = await getMessageLogs({ status, customerId, limit });

    // Convert Firestore timestamps to ISO strings
    const serialized = logs.map((log) => ({
      ...log,
      sentAt: log.sentAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({ logs: serialized }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error fetching message logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

/**
 * Retry a failed message.
 * Body: { logId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { logId } = body;

    if (!logId) {
      return NextResponse.json(
        { error: 'logId is required' },
        { status: 400 }
      );
    }

    // Fetch the failed log entry
    const app = getFirebaseAdmin();
    const db = admin.firestore(app);
    const logDoc = await db.collection('message_logs').doc(logId).get();

    if (!logDoc.exists) {
      return NextResponse.json(
        { error: 'Log entry not found' },
        { status: 404 }
      );
    }

    const logData = logDoc.data()!;

    if (logData.status !== 'failed') {
      return NextResponse.json(
        { error: 'Can only retry failed messages' },
        { status: 400 }
      );
    }

    // Get customer name for the retry
    const customer = logData.customerId
      ? await getCustomerById(logData.customerId)
      : null;

    // Retry sending
    const result = await sendWhatsAppTemplate({
      phone: logData.phone,
      templateName: logData.templateName,
      userName: customer?.customerName || 'Customer',
      journeyId: logData.journeyId || '',
      customerId: logData.customerId || '',
    });

    // Update the original log entry status
    if (result.success) {
      await db.collection('message_logs').doc(logId).update({
        status: 'sent',
        error: null,
        response: JSON.stringify(result.response),
      });
    }

    return NextResponse.json(
      {
        success: result.success,
        logId,
        retryResult: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error retrying message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retry message' },
      { status: 500 }
    );
  }
}
