import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quotation from '@/models/Quotation';
import { requireAuth, getAdminId } from '@/lib/auth';
import { getNextSequenceNumber, CounterName } from '@/lib/counterService';
import { z } from 'zod';

const particularSchema = z.object({
  sn: z.coerce.number(),
  particulars: z.string().min(1, 'Particulars is required'),
  quantity: z.coerce.number().min(0.01, 'Quantity must be greater than 0'),
  rate: z.coerce.number().min(0.01, 'Rate must be greater than 0'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
});

const quotationSchema = z.object({
  partyName: z.string().min(1, 'Party name is required'),
  address: z.string().min(1, 'Address is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  particulars: z.array(particularSchema).min(1, 'At least one particular is required'),
  hasVAT: z.boolean(),
});

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth();
    const adminId = getAdminId(user);

    const quotations = await Quotation.find({ adminId }).sort({ createdAt: -1 });

    return NextResponse.json({ quotations }, { status: 200 });
  } catch (error: any) {
    console.error('Get quotations error:', error);
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
    const validatedData = quotationSchema.parse(body);

    const quotationSN = await getNextSequenceNumber(adminId, CounterName.QUOTATION);

    const total = validatedData.particulars.reduce((sum, item) => sum + item.amount, 0);

    let subtotal = 0;
    let vatAmount = 0;
    let grandTotal = total;

    if (validatedData.hasVAT) {
      subtotal = Number((total / 1.13).toFixed(2));
      vatAmount = Number((subtotal * 0.13).toFixed(2));
      grandTotal = Number((subtotal + vatAmount).toFixed(2));
    }

    const quotation = await Quotation.create({
      ...validatedData,
      quotationSN,
      adminId,
      createdBy: user.email,
      total,
      subtotal: validatedData.hasVAT ? subtotal : undefined,
      vatAmount: validatedData.hasVAT ? vatAmount : undefined,
      grandTotal,
    });

    return NextResponse.json(
      { message: 'Quotation created successfully', quotation },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create quotation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
