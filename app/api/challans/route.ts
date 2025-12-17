import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Challan from '@/models/Challan';
import { requireAuth, getAdminId } from '@/lib/auth';
import { getNextSequenceNumber, CounterName } from '@/lib/counterService';
import { z } from 'zod';

const challanParticularSchema = z.object({
  sn: z.number(),
  particulars: z.string().min(1, 'Particulars is required'),
  quantity: z.number().min(0, 'Quantity must be at least 0'),
});

const challanSchema = z.object({
  challanDate: z.string().min(1, 'Challan date is required'),
  destination: z.string().min(1, 'Destination is required'),
  estimateReferenceNo: z.string().min(1, 'Estimate reference number is required'),
  particulars: z.array(challanParticularSchema).min(1, 'At least one particular is required'),
});

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth();
    const adminId = getAdminId(user);

    const challans = await Challan.find({ adminId }).sort({ createdAt: -1 });

    return NextResponse.json({ challans }, { status: 200 });
  } catch (error: any) {
    console.error('Get challans error:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth();
    const adminId = getAdminId(user);

    const body = await request.json();
    const validatedData = challanSchema.parse(body);

    // Calculate total units
    const totalUnits = validatedData.particulars.reduce((sum, p) => sum + p.quantity, 0);

    // Get next sequence number
    const challanNumber = await getNextSequenceNumber(adminId, CounterName.CHALLAN);

    const challan = await Challan.create({
      adminId,
      challanNumber,
      challanDate: validatedData.challanDate,
      destination: validatedData.destination,
      estimateReferenceNo: validatedData.estimateReferenceNo,
      particulars: validatedData.particulars,
      totalUnits,
      createdBy: user.email || user._id.toString(),
    });

    return NextResponse.json(
      { message: 'Challan created successfully', challan },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create challan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
