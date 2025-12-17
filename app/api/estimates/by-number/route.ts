import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Estimate, { IParticular } from '@/models/Estimate';
import { requireAuth, getAdminId } from '@/lib/auth';
import { z } from 'zod';

const getEstimateSchema = z.object({
  estimateNumber: z.string().min(1, 'Estimate number is required'),
});

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth();
    const adminId = getAdminId(user);

    const body = await request.json();
    const validatedData = getEstimateSchema.parse(body);

    const estimate = await Estimate.findOne({
      adminId,
      estimateNumber: validatedData.estimateNumber,
    });

    if (!estimate) {
      return NextResponse.json(
        { error: 'Estimate not found' },
        { status: 404 }
      );
    }

    // Convert estimate particulars to challan particulars format (remove rate and amount)
    const challanParticulars = estimate.particulars.map((p: IParticular, index: number) => ({
      sn: index + 1,
      particulars: p.particulars,
      quantity: p.quantity,
    }));

    return NextResponse.json(
      {
        estimate: {
          estimateNumber: estimate.estimateNumber,
          particulars: challanParticulars,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get estimate by number error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
