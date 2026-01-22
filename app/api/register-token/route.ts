import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/src/config/database';
import { tokenService } from '@/src/services/tokenService';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Token is required and must be a string' },
        { status: 400 }
      );
    }

    const result = await tokenService.saveToken(token);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error registering token:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to register token' },
      { status: 500 }
    );
  }
}
