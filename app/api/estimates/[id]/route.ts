import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Estimate from '@/models/Estimate';
import Job from '@/models/Job';
import { requireAuth, getAdminId } from '@/lib/auth';
import { z } from 'zod';

const particularSchema = z.object({
  sn: z.coerce.number(),
  particulars: z.string().min(1, 'Particulars is required'),
  quantity: z.coerce.number().min(0.01, 'Quantity must be greater than 0'),
  rate: z.coerce.number().min(0.01, 'Rate must be greater than 0'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
});

const updateEstimateSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  jobId: z.string().min(1, 'Job is required'),
  estimateDate: z.string().min(1, 'Estimate date is required'),
  particulars: z.array(particularSchema).min(1, 'At least one particular is required'),
  hasDiscount: z.boolean().optional(),
  discountPercentage: z.coerce.number().min(0).max(100).optional(),
  vatType: z.enum(['excluded', 'included', 'none']),
  remarks: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await requireAuth();
    const adminId = getAdminId(user);
    const { id } = await params;

    const estimate = await Estimate.findOne({ _id: id, adminId })
      .populate('clientId', 'clientName')
      .populate('jobId', 'jobNo jobName totalBWPages totalColorPages totalPages paperSize');

    if (!estimate) {
      return NextResponse.json(
        { error: 'Estimate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ estimate }, { status: 200 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Get estimate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const validatedData = updateEstimateSchema.parse(body);

    // Get job details if jobId is provided
    const job = await Job.findOne({ _id: validatedData.jobId, adminId });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Calculate totals
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

    const estimate = await Estimate.findOneAndUpdate(
      { _id: id, adminId },
      {
        ...validatedData,
        totalBWPages: job.totalBWPages,
        totalColorPages: job.totalColorPages,
        totalPages: job.totalPages,
        paperSize: job.paperSize,
        total,
        hasDiscount: validatedData.hasDiscount || false,
        discountPercentage: validatedData.hasDiscount ? validatedData.discountPercentage : undefined,
        discountAmount: validatedData.hasDiscount && discountAmount > 0 ? discountAmount : undefined,
        priceAfterDiscount: validatedData.hasDiscount && discountAmount > 0 ? priceAfterDiscount : undefined,
        vatType: validatedData.vatType,
        vatAmount: validatedData.vatType !== 'none' ? vatAmount : undefined,
        grandTotal,
      },
      { new: true }
    ).populate('clientId', 'clientName')
     .populate('jobId', 'jobNo jobName');

    if (!estimate) {
      return NextResponse.json(
        { error: 'Estimate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Estimate updated successfully', estimate },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Update estimate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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

    const estimate = await Estimate.findOneAndDelete({ _id: id, adminId });

    if (!estimate) {
      return NextResponse.json(
        { error: 'Estimate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Estimate deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Delete estimate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
