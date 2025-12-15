import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Estimate from '@/models/Estimate';
import Job from '@/models/Job';
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

const estimateSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  jobId: z.string().min(1, 'Job is required'),
  estimateDate: z.string().min(1, 'Estimate date is required'),
  particulars: z.array(particularSchema).min(1, 'At least one particular is required'),
  hasVAT: z.boolean(),
});

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth();
    const adminId = getAdminId(user);

    const estimates = await Estimate.find({ adminId })
      .populate('clientId', 'clientName')
      .populate('jobId', 'jobNo jobName')
      .sort({ createdAt: -1 });

    return NextResponse.json({ estimates }, { status: 200 });
  } catch (error: any) {
    console.error('Get estimates error:', error);
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
    const validatedData = estimateSchema.parse(body);

    const job = await Job.findOne({ _id: validatedData.jobId, adminId });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const estimateNumber = await getNextSequenceNumber(adminId, CounterName.ESTIMATE);

    const total = validatedData.particulars.reduce((sum, item) => sum + item.amount, 0);

    let subtotal = 0;
    let vatAmount = 0;
    let grandTotal = total;

    if (validatedData.hasVAT) {
      subtotal = Number((total / 1.13).toFixed(2));
      vatAmount = Number((subtotal * 0.13).toFixed(2));
      grandTotal = Number((subtotal + vatAmount).toFixed(2));
    }

    const estimate = await Estimate.create({
      ...validatedData,
      estimateNumber,
      totalBWPages: job.totalBWPages,
      totalColorPages: job.totalColorPages,
      totalPages: job.totalPages,
      paperSize: job.paperSize,
      adminId,
      createdBy: user.email,
      total,
      subtotal: validatedData.hasVAT ? subtotal : undefined,
      vatAmount: validatedData.hasVAT ? vatAmount : undefined,
      grandTotal,
    });

    const populatedEstimate = await Estimate.findById(estimate._id)
      .populate('clientId', 'clientName')
      .populate('jobId', 'jobNo jobName');

    return NextResponse.json(
      { message: 'Estimate created successfully', estimate: populatedEstimate },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create estimate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
