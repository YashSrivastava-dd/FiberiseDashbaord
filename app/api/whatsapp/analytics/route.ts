/**
 * WhatsApp Analytics API
 *
 * GET /api/whatsapp/analytics — Aggregated analytics data
 */

import { NextResponse } from 'next/server';
import { getAnalytics } from '@/src/services/firestore.service';

export async function GET() {
  try {
    const analytics = await getAnalytics();
    return NextResponse.json({ analytics }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error fetching analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
