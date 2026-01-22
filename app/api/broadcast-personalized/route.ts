import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/src/config/database';
import { initializeFirebaseAdmin } from '@/src/firebase/firebase.config';
import { broadcastPersonalizedNotifications } from '@/src/services/personalizedNotificationService';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    initializeFirebaseAdmin();

    const body = await request.json().catch(() => ({}));
    const { batchSize, useRecommendedCategory } = body;

    console.log('🚀 Starting personalized broadcast via API...');

    const result = await broadcastPersonalizedNotifications(
      batchSize || 500,
      useRecommendedCategory !== false // Default to true
    );

    return NextResponse.json({
      success: result.success,
      totalUsers: result.totalUsers,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
      errors: result.errors.slice(0, 50), // Limit errors in response
      summary: {
        totalProcessed: result.totalUsers,
        successful: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        successRate: result.totalUsers > 0 
          ? ((result.sent / (result.totalUsers - result.skipped)) * 100).toFixed(2) + '%'
          : '0%',
      },
      // Include first 10 details as sample
      sampleDetails: result.details.slice(0, 10),
    });
  } catch (error: any) {
    console.error('❌ Error in personalized broadcast API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to broadcast personalized notifications',
        totalUsers: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [],
      },
      { status: 500 }
    );
  }
}
