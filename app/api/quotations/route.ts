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
  hasDiscount: z.boolean().optional(),
  discountPercentage: z.coerce.number().min(0).max(100).optional(),
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

    // Step 1: Calculate discount (if enabled)
    let discountAmount = 0;
    let priceAfterDiscount = total;
    
    if (validatedData.hasDiscount && validatedData.discountPercentage && validatedData.discountPercentage > 0) {
      discountAmount = Number(((total * validatedData.discountPercentage) / 100).toFixed(2));
      priceAfterDiscount = Number((total - discountAmount).toFixed(2));
    }
    
    // Step 2: Calculate VAT on the discounted price (if enabled)
    let vatAmount = 0;
    let grandTotal = priceAfterDiscount;
    
    if (validatedData.hasVAT) {
      vatAmount = Number((priceAfterDiscount * 0.13).toFixed(2));
      grandTotal = Number((priceAfterDiscount + vatAmount).toFixed(2));
    }

    const quotation = await Quotation.create({
      ...validatedData,
      quotationSN,
      adminId,
      createdBy: user.email,
      total,
      hasDiscount: validatedData.hasDiscount || false,
      discountPercentage: validatedData.hasDiscount ? validatedData.discountPercentage : undefined,
      discountAmount: validatedData.hasDiscount && discountAmount > 0 ? discountAmount : undefined,
      priceAfterDiscount: validatedData.hasDiscount && discountAmount > 0 ? priceAfterDiscount : undefined,
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
