import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { requireAdmin, getAdminId } from '@/lib/auth';
import { resetCounter, CounterName } from '@/lib/counterService';
import { z } from 'zod';

const resetCounterSchema = z.object({
  counterType: z.enum(['quotation', 'job', 'estimate']),
});

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const admin = await requireAdmin();
    const adminId = getAdminId(admin);

    const body = await request.json();
    const validatedData = resetCounterSchema.parse(body);

    let counterName: CounterName;
    switch (validatedData.counterType) {
      case 'quotation':
        counterName = CounterName.QUOTATION;
        break;
      case 'job':
        counterName = CounterName.JOB;
        break;
      case 'estimate':
        counterName = CounterName.ESTIMATE;
        break;
    }

    await resetCounter(adminId, counterName);

    return NextResponse.json(
      { message: `${validatedData.counterType} counter reset successfully` },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === 'Unauthorized' || error.message === 'Admin access required') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Reset counter error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
