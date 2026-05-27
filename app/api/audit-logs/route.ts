export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { decryptSession } from '@/src/services/auth';
import { getActionLogs } from '@/src/services/auditLogService';

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate check (middleware verifies it, but let's parse session for double-safety)
    const sessionCookie = req.cookies.get('fiberise_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized: No active session found.' },
        { status: 401 }
      );
    }

    const session = decryptSession(sessionCookie);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Session is invalid or expired.' },
        { status: 401 }
      );
    }

    // 2. Fetch logs from Firestore
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit') || '200';
    const limitVal = parseInt(limitParam, 10) || 200;

    const logs = await getActionLogs(limitVal);

    // Convert Firestore Timestamps to ISO strings or numeric milliseconds
    const sanitizedLogs = logs.map(log => {
      let isoString = new Date().toISOString();
      if (log.timestamp) {
        if (typeof log.timestamp.toDate === 'function') {
          isoString = log.timestamp.toDate().toISOString();
        } else if (log.timestamp._seconds) {
          isoString = new Date(log.timestamp._seconds * 1000).toISOString();
        } else if (typeof log.timestamp === 'string') {
          isoString = log.timestamp;
        } else if (log.timestamp instanceof Date) {
          isoString = log.timestamp.toISOString();
        }
      }
      return {
        ...log,
        timestamp: isoString
      };
    });

    return NextResponse.json({ success: true, logs: sanitizedLogs }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error fetching audit logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
