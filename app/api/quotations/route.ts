import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quotation from '@/models/Quotation';
import { requireAuth, getAdminId } from '@/lib/auth';
import { getNextSequenceNumber, CounterName } from '@/lib/counterService';
import { z } from 'zod';
import { ToWords } from 'to-words';

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
  vatType: z.enum(['excluded', 'included', 'none']),
  remarks: z.string().optional(),
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

    let basePrice = total;
    
    // If VAT is included in the price, extract it first
    if (validatedData.vatType === 'included') {
      basePrice = Number((total / 1.13).toFixed(2));
    }
    
    // Step 1: Calculate discount on base price (if enabled)
    let discountAmount = 0;
    let priceAfterDiscount = basePrice;
    
    if (validatedData.hasDiscount && validatedData.discountPercentage && validatedData.discountPercentage > 0) {
      discountAmount = Number(((basePrice * validatedData.discountPercentage) / 100).toFixed(2));
      priceAfterDiscount = Number((basePrice - discountAmount).toFixed(2));
    }
    
    // Step 2: Calculate VAT based on type
    let vatAmount = 0;
    let grandTotal = priceAfterDiscount;
    
    if (validatedData.vatType === 'excluded' || validatedData.vatType === 'included') {
      vatAmount = Number((priceAfterDiscount * 0.13).toFixed(2));
      grandTotal = Number((priceAfterDiscount + vatAmount).toFixed(2));
    }

    // Convert grand total to words
    const toWords = new ToWords({
      localeCode: 'en-IN',
      converterOptions: {
        currency: true,
        ignoreDecimal: false,
        ignoreZeroCurrency: false,
      },
    });
    const amountInWords = toWords.convert(grandTotal);

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
      vatType: validatedData.vatType,
      vatAmount: validatedData.vatType !== 'none' ? vatAmount : undefined,
      grandTotal,
      amountInWords,
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
