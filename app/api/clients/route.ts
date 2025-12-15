import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';
import { requireAuth, getAdminId } from '@/lib/auth';
import { z } from 'zod';

const clientSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  address: z.string().optional(),
  emailAddress: z.string().email().optional().or(z.literal('')),
  mobile: z.string().min(1, 'Mobile number is required'),
  contactPerson: z.string().optional(),
  department: z.string().optional(),
  contactEmailAddress: z.string().email().optional().or(z.literal('')),
  contactTelephone: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth();
    const adminId = getAdminId(user);

    const clients = await Client.find({ adminId }).sort({ createdAt: -1 });

    return NextResponse.json({ clients }, { status: 200 });
  } catch (error: any) {
    console.error('Get clients error:', error);
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
    const validatedData = clientSchema.parse(body);

    const client = await Client.create({
      ...validatedData,
      adminId,
      createdBy: user.email,
    });

    return NextResponse.json(
      { message: 'Client created successfully', client },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create client error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
