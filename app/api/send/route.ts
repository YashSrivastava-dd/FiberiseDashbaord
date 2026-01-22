import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/src/config/database';
import { initializeFirebaseAdmin } from '@/src/firebase/firebase.config';
import { notificationService } from '@/src/services/notificationService';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    initializeFirebaseAdmin();

    const body = await request.json();
    const { token, title, body: bodyText, data } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Token is required and must be a string' },
        { status: 400 }
      );
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Title is required and must be a string' },
        { status: 400 }
      );
    }

    if (!bodyText || typeof bodyText !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Body is required and must be a string' },
        { status: 400 }
      );
    }

    const result = await notificationService.sendToToken(token, {
      title,
      body: bodyText,
      data: data || {},
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}
