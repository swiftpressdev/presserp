import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PaperStock from '@/models/PaperStock';
import { requireAuth, getAdminId } from '@/lib/auth';
import { z } from 'zod';

const paperStockSchema = z.object({
  paperId: z.string().min(1, 'Paper ID is required'),
  date: z.string().min(1, 'Date is required'),
  jobNo: z.string().optional(),
  jobName: z.string().optional(),
  jobId: z.string().optional(),
  issuedPaper: z.number().min(0, 'Issued paper must be 0 or greater'),
  wastage: z.number().min(0, 'Wastage must be 0 or greater'),
  remaining: z.number(),
  remarks: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth();
    const adminId = getAdminId(user);

    const { searchParams } = new URL(request.url);
    const paperId = searchParams.get('paperId');

    if (!paperId) {
      return NextResponse.json({ error: 'Paper ID is required' }, { status: 400 });
    }

    const stockEntries = await PaperStock.find({ adminId, paperId })
      .populate('jobId', 'jobNo jobName')
      .sort({ date: 1, createdAt: 1 });

    return NextResponse.json({ stockEntries }, { status: 200 });
  } catch (error: any) {
    console.error('Get paper stock error:', error);
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
    const validatedData = paperStockSchema.parse(body);

    // Get paper to calculate remaining
    const Paper = (await import('@/models/Paper')).default;
    const paper = await Paper.findById(validatedData.paperId);
    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    // Get all existing stock entries sorted by date to find the previous remaining
    const allEntries = await PaperStock.find({ adminId, paperId: validatedData.paperId })
      .sort({ date: 1, createdAt: 1 });
    
    // Calculate remaining based on the last entry or original stock
    let remaining: number;
    if (allEntries.length === 0) {
      remaining = (paper.originalStock || 0) - validatedData.issuedPaper - validatedData.wastage;
    } else {
      const lastEntry = allEntries[allEntries.length - 1];
      remaining = lastEntry.remaining - validatedData.issuedPaper - validatedData.wastage;
    }

    // If jobId is provided, populate job details
    let jobNo = validatedData.jobNo;
    let jobName = validatedData.jobName;
    
    if (validatedData.jobId && !jobNo) {
      const Job = (await import('@/models/Job')).default;
      const job = await Job.findById(validatedData.jobId);
      if (job) {
        jobNo = job.jobNo;
        jobName = job.jobName;
      }
    }

    const stockEntry = await PaperStock.create({
      adminId,
      paperId: validatedData.paperId,
      date: validatedData.date,
      jobNo,
      jobName,
      jobId: validatedData.jobId || undefined,
      issuedPaper: validatedData.issuedPaper,
      wastage: validatedData.wastage,
      remaining: Math.max(0, remaining),
      remarks: validatedData.remarks || undefined,
      createdBy: user.email || user.id,
    });

    return NextResponse.json(
      { message: 'Stock entry created successfully', stockEntry },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create paper stock error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
