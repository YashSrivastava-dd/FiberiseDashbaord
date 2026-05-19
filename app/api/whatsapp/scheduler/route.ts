/**
 * WhatsApp Scheduler API
 *
 * GET  /api/whatsapp/scheduler — Get scheduler status
 * POST /api/whatsapp/scheduler — Manually trigger a scheduler tick
 */

import { NextResponse } from 'next/server';
import {
  triggerSchedulerManually,
  getSchedulerStatus,
} from '@/src/jobs/journeyScheduler';

export async function GET() {
  try {
    const status = getSchedulerStatus();
    return NextResponse.json({ scheduler: status }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error getting scheduler status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get scheduler status' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const result = await triggerSchedulerManually();
    return NextResponse.json({ result }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error triggering scheduler:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger scheduler' },
      { status: 500 }
    );
  }
}
