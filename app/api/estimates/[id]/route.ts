import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import Estimate from '@/models/Estimate';
import Job from '@/models/Job';
import Client from '@/models/Client';
import { requireAuth, getAdminId } from '@/lib/auth';
import { z } from 'zod';
import { ToWords } from 'to-words';

const particularSchema = z.object({
  sn: z.coerce.number(),
  particulars: z.string().min(1, 'Particulars is required'),
  quantity: z.coerce.number().min(0.01, 'Quantity must be greater than 0'),
  rate: z.coerce.number().min(0.01, 'Rate must be greater than 0'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
});

const deliveryNoteSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  challanNo: z.string().min(1, 'Challan number is required'),
  quantity: z.coerce.number().min(0, 'Quantity must be at least 0'),
  remarks: z.string().optional(),
});

const updateEstimateSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  jobId: z.union([
    z.string().min(1, 'Job is required'),
    z.array(z.string().min(1)).min(1, 'At least one job is required'),
  ]),
  estimateDate: z.string().min(1, 'Estimate date is required'),
  particulars: z.array(particularSchema).min(1, 'At least one particular is required'),
  deliveryNotes: z.array(deliveryNoteSchema).optional(),
  hasDiscount: z.boolean().optional(),
  discountPercentage: z.coerce.number().min(0).max(100).optional(),
  vatType: z.enum(['excluded', 'included', 'none']),
  remarks: z.string().optional(),
  finishSize: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    // Force model registration by accessing the default export
    const ClientModel = (await import('@/models/Client')).default;
    const JobModel = (await import('@/models/Job')).default;
    void ClientModel;
    void JobModel;
    
    const user = await requireAuth();
    const adminId = getAdminId(user);
    const { id } = await params;

    const estimate = await Estimate.findOne({ _id: id, adminId })
      .populate('clientId', 'clientName')
      .populate('jobId', 'jobNo jobName quantity totalBWPages totalColorPages totalPages paperSize');

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
    
    // Force model registration by accessing the default export
    const ClientModel = (await import('@/models/Client')).default;
    const JobModel = (await import('@/models/Job')).default;
    void ClientModel;
    void JobModel;
    
    const user = await requireAuth();
    const adminId = getAdminId(user);
    const { id } = await params;

    const body = await request.json();
    const validatedData = updateEstimateSchema.parse(body);

    // Normalize jobId to array
    const jobIds = Array.isArray(validatedData.jobId) ? validatedData.jobId : [validatedData.jobId];

    // Fetch all jobs
    const jobs = await Job.find({ _id: { $in: jobIds }, adminId });
    if (jobs.length !== jobIds.length) {
      return NextResponse.json({ error: 'One or more jobs not found' }, { status: 404 });
    }

    // Sum up pages from all jobs
    const totalBWPages = jobs.reduce((sum, job) => sum + (job.totalBWPages || 0), 0);
    const totalColorPages = jobs.reduce((sum, job) => sum + (job.totalColorPages || 0), 0);
    const totalPages = jobs.reduce((sum, job) => sum + (job.totalPages || 0), 0);

    // Collect all unique paper sizes from all jobs
    const allPaperSizes: string[] = [];
    jobs.forEach(job => {
      if (job.paperSize) {
        // paperSize might already be comma-separated, so split and add each
        String(job.paperSize).split(',').map(s => s.trim()).filter(Boolean).forEach(size => {
          if (!allPaperSizes.includes(size)) allPaperSizes.push(size);
        });
      } else if (job.paperDetails && Array.isArray(job.paperDetails) && job.paperDetails.length > 0) {
        // Fallback to paperDetails for legacy jobs
        (job.paperDetails as any[]).forEach(detail => {
          if (detail.size && !allPaperSizes.includes(detail.size)) {
            allPaperSizes.push(detail.size);
          }
        });
      }
    });
    const paperSize = allPaperSizes.join(', ');

    // Collect all unique finish sizes from all jobs
    const allFinishSizes: string[] = [];
    jobs.forEach(job => {
      const jobFinishSize = job.bookSize === 'Other' && job.bookSizeOther 
        ? job.bookSizeOther 
        : job.bookSize || '';
      if (jobFinishSize && !allFinishSizes.includes(jobFinishSize)) {
        allFinishSizes.push(jobFinishSize);
      }
    });
    const finishSize = validatedData.finishSize || allFinishSizes.join(', ');

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

    const estimate = await Estimate.findOneAndUpdate(
      { _id: id, adminId },
      {
        ...validatedData,
        jobId: jobIds,
        totalBWPages,
        totalColorPages,
        totalPages,
        paperSize,
        finishSize: finishSize || undefined,
        total,
        hasDiscount: validatedData.hasDiscount || false,
        discountPercentage: validatedData.hasDiscount ? validatedData.discountPercentage : undefined,
        discountAmount: validatedData.hasDiscount && discountAmount > 0 ? discountAmount : undefined,
        priceAfterDiscount: validatedData.hasDiscount && discountAmount > 0 ? priceAfterDiscount : undefined,
        vatType: validatedData.vatType,
        vatAmount: validatedData.vatType !== 'none' ? vatAmount : undefined,
        grandTotal,
        amountInWords,
        deliveryNotes: validatedData.deliveryNotes || [],
      },
      { new: true }
    ).populate('clientId', 'clientName')
     .populate('jobId', 'jobNo jobName quantity');

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
