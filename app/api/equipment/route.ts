import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Equipment from '@/models/Equipment';
import { requireAuth, getAdminId } from '@/lib/auth';
import { z } from 'zod';

const equipmentSchema = z.object({
  equipmentName: z.string().min(1, 'Equipment name is required'),
  size: z.string().min(1, 'Size is required'),
  status: z.string().min(1, 'Status is required'),
  lastMaintainedDate: z.string().min(1, 'Last maintained date is required'),
});

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth();
    const adminId = getAdminId(user);

    const equipment = await Equipment.find({ adminId }).sort({ createdAt: -1 });

    return NextResponse.json({ equipment }, { status: 200 });
  } catch (error: any) {
    console.error('Get equipment error:', error);
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
    const validatedData = equipmentSchema.parse(body);

    const equipment = await Equipment.create({
      ...validatedData,
      adminId,
      createdBy: user.email,
    });

    return NextResponse.json(
      { message: 'Equipment created successfully', equipment },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create equipment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
