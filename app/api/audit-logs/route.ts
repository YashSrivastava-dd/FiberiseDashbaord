export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { decryptSession } from '@/src/services/auth';
import { getActionLogsPaginated } from '@/src/services/auditLogService';

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate — only admins/super_admins can view audit logs
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

    // Role check — restrict to admin and super_admin
    if (!['admin', 'super_admin'].includes(session.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to view audit logs.' },
        { status: 403 }
      );
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '25', 10)));
    const actionType = searchParams.get('action_type') || undefined;
    const module = searchParams.get('module') || undefined;
    const userEmail = searchParams.get('user') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const startDate = searchParams.get('start_date') || undefined;
    const endDate = searchParams.get('end_date') || undefined;
    const ipAddress = searchParams.get('ip') || undefined;

    // 3. Fetch paginated + filtered logs
    const { logs, total } = await getActionLogsPaginated({
      page,
      perPage,
      actionType,
      module,
      userEmail,
      status,
      search,
      startDate,
      endDate,
      ipAddress,
    });

    const totalPages = Math.ceil(total / perPage) || 1;

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
      },
    }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error fetching audit logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
