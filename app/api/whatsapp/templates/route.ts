/**
 * WhatsApp Templates API
 *
 * GET    /api/whatsapp/templates — List all template mappings
 * POST   /api/whatsapp/templates — Create a new template mapping
 * PATCH  /api/whatsapp/templates — Update an existing template
 * DELETE /api/whatsapp/templates — Delete a template mapping
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '@/src/services/firestore.service';
import { decryptSession } from '@/src/services/auth';
import { logAction } from '@/src/services/auditLogService';

function getSessionInfo(req: NextRequest) {
  const sessionCookie = req.cookies.get('fiberise_session')?.value;
  const session = sessionCookie ? decryptSession(sessionCookie) : null;
  return {
    email: session?.email || 'system@fiberisefit.com',
    userId: session?.email || 'system',
  };
}

export async function GET() {
  try {
    const templates = await getAllTemplates();
    return NextResponse.json({ templates }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error fetching templates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { templateName, campaignName, templateId, dayNumber, messageContent, variables, active } = body;

    // Validation
    if (!templateName || dayNumber === undefined || dayNumber === null) {
      return NextResponse.json(
        { error: 'templateName and dayNumber are required' },
        { status: 400 }
      );
    }

    const id = await createTemplate({
      templateName,
      campaignName: campaignName || '',
      templateId: templateId || '',
      dayNumber: Number(dayNumber),
      messageContent: messageContent || '',
      variables: variables || [],
      active: active !== false, // Default to true
    });

    // Trace action
    const { userId, email } = getSessionInfo(req);
    await logAction(
      userId,
      email,
      'CREATE_TEMPLATE',
      { id, templateName, dayNumber: Number(dayNumber), campaignName },
      req
    );

    return NextResponse.json(
      { success: true, id, templateName, dayNumber },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Error creating template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create template' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { templateId, ...updates } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: 'templateId is required' },
        { status: 400 }
      );
    }

    // Convert dayNumber to number if present
    if (updates.dayNumber !== undefined) {
      updates.dayNumber = Number(updates.dayNumber);
    }

    await updateTemplate(templateId, updates);

    // Trace action
    const { userId, email } = getSessionInfo(req);
    await logAction(
      userId,
      email,
      'UPDATE_TEMPLATE',
      { templateId, updates },
      req
    );

    return NextResponse.json(
      { success: true, templateId },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error updating template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template id is required as query parameter' },
        { status: 400 }
      );
    }

    await deleteTemplate(templateId);

    // Trace action
    const { userId, email } = getSessionInfo(req);
    await logAction(
      userId,
      email,
      'DELETE_TEMPLATE',
      { templateId },
      req
    );

    return NextResponse.json(
      { success: true, deleted: templateId },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error deleting template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete template' },
      { status: 500 }
    );
  }
}
