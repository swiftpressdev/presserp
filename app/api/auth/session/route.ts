import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';

export async function GET() {
  try {
    await dbConnect();
    
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          adminId: user.adminId,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    // Don't log expired token errors as errors - they're expected
    if (error?.name !== 'TokenExpiredError') {
      console.error('Session verification error:', error);
    }
    return NextResponse.json(
      { authenticated: false },
      { status: 200 }
    );
  }
}
