import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Challan from '@/models/Challan';
import { requireAuth, getAdminId } from '@/lib/auth';
import { z } from 'zod';

const challanParticularSchema = z.object({
  sn: z.number(),
  particulars: z.string().min(1, 'Particulars is required'),
  quantity: z.number().min(0, 'Quantity must be at least 0'),
});

const updateChallanSchema = z.object({
  challanDate: z.string().min(1, 'Challan date is required'),
  destination: z.string().min(1, 'Destination is required'),
  estimateReferenceNo: z.string().min(1, 'Estimate reference number is required'),
  particulars: z.array(challanParticularSchema).min(1, 'At least one particular is required'),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await requireAuth();
    const adminId = getAdminId(user);

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateChallanSchema.parse(body);

    // Calculate total units
    const totalUnits = validatedData.particulars.reduce((sum, p) => sum + p.quantity, 0);

    const challan = await Challan.findOneAndUpdate(
      { _id: id, adminId },
      {
        challanDate: validatedData.challanDate,
        destination: validatedData.destination,
        estimateReferenceNo: validatedData.estimateReferenceNo,
        particulars: validatedData.particulars,
        totalUnits,
      },
      { new: true }
    );

    if (!challan) {
      return NextResponse.json({ error: 'Challan not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Challan updated successfully', challan },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update challan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await requireAuth();
    const adminId = getAdminId(user);

    const { id } = await params;
    const challan = await Challan.findOneAndDelete({ _id: id, adminId });

    if (!challan) {
      return NextResponse.json({ error: 'Challan not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Challan deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete challan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
