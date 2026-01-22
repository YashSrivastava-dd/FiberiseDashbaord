import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/src/config/database';
import { initializeFirebaseAdmin } from '@/src/firebase/firebase.config';
import { notificationService } from '@/src/services/notificationService';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    initializeFirebaseAdmin();

    const body = await request.json();
    const { title, body: bodyText, data } = body;

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

    // Use Firestore tokens for broadcast (since tokens are stored in Firestore user documents)
    const result = await notificationService.broadcastToAll(
      {
        title,
        body: bodyText,
        data: data || {},
      },
      true // useFirestore = true
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error broadcasting notification:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to broadcast notification' },
      { status: 500 }
    );
  }
}
