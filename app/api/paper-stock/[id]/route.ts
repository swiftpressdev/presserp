import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PaperStock from '@/models/PaperStock';
import { requireAuth, getAdminId } from '@/lib/auth';
import { z } from 'zod';

const updatePaperStockSchema = z.object({
  date: z.string().min(1, 'Date is required').optional(),
  jobNo: z.string().optional(),
  jobName: z.string().optional(),
  jobId: z.string().optional(),
  issuedPaper: z.number().min(0, 'Issued paper must be 0 or greater').optional(),
  wastage: z.number().min(0, 'Wastage must be 0 or greater').optional(),
  remaining: z.number().optional(),
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

    const stockEntry = await PaperStock.findOne({ _id: id, adminId })
      .populate('jobId', 'jobNo jobName');

    if (!stockEntry) {
      return NextResponse.json(
        { error: 'Stock entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ stockEntry }, { status: 200 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Get paper stock error:', error);
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
    const validatedData = updatePaperStockSchema.parse(body);

    // Get the stock entry and paper to calculate remaining
    const stockEntry = await PaperStock.findOne({ _id: id, adminId });
    if (!stockEntry) {
      return NextResponse.json({ error: 'Stock entry not found' }, { status: 404 });
    }

    const Paper = (await import('@/models/Paper')).default;
    const paper = await Paper.findById(stockEntry.paperId);
    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    // Get all stock entries sorted by date
    const allEntries = await PaperStock.find({ adminId, paperId: stockEntry.paperId })
      .sort({ date: 1, createdAt: 1 });
    
    const entryIndex = allEntries.findIndex((e) => e._id.toString() === id);
    
    // Calculate remaining for this entry
    let remaining: number;
    if (entryIndex === 0) {
      remaining = (paper.originalStock || 0) - (validatedData.issuedPaper ?? stockEntry.issuedPaper) - (validatedData.wastage ?? stockEntry.wastage);
    } else {
      const previousRemaining = allEntries[entryIndex - 1].remaining;
      remaining = previousRemaining - (validatedData.issuedPaper ?? stockEntry.issuedPaper) - (validatedData.wastage ?? stockEntry.wastage);
    }

    // If jobId is provided, populate job details
    let updateData: any = { 
      ...validatedData,
      remaining: Math.max(0, remaining),
    };
    
    if (validatedData.jobId && !validatedData.jobNo) {
      const Job = (await import('@/models/Job')).default;
      const job = await Job.findById(validatedData.jobId);
      if (job) {
        updateData.jobNo = job.jobNo;
        updateData.jobName = job.jobName;
      }
    }

    const updatedEntry = await PaperStock.findOneAndUpdate(
      { _id: id, adminId },
      updateData,
      { new: true }
    ).populate('jobId', 'jobNo jobName');

    // Recalculate all subsequent entries
    const subsequentEntries = allEntries.slice(entryIndex + 1);
    let currentRemaining = remaining;
    
    for (const entry of subsequentEntries) {
      currentRemaining = currentRemaining - entry.issuedPaper - entry.wastage;
      await PaperStock.findByIdAndUpdate(entry._id, {
        remaining: Math.max(0, currentRemaining),
      });
    }

    return NextResponse.json(
      { message: 'Stock entry updated successfully', stockEntry: updatedEntry },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update paper stock error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
    const stockEntry = await PaperStock.findOne({ _id: id, adminId });

    if (!stockEntry) {
      return NextResponse.json({ error: 'Stock entry not found' }, { status: 404 });
    }

    // Get all stock entries sorted by date
    const allEntries = await PaperStock.find({ adminId, paperId: stockEntry.paperId })
      .sort({ date: 1, createdAt: 1 });
    
    const entryIndex = allEntries.findIndex((e) => e._id.toString() === id);
    
    // Delete the entry
    await PaperStock.findByIdAndDelete(id);

    // Recalculate all subsequent entries
    const subsequentEntries = allEntries.slice(entryIndex + 1);
    if (subsequentEntries.length > 0) {
      // Get the remaining from the entry before the deleted one
      let currentRemaining: number;
      if (entryIndex === 0) {
        const Paper = (await import('@/models/Paper')).default;
        const paper = await Paper.findById(stockEntry.paperId);
        currentRemaining = paper?.originalStock || 0;
      } else {
        currentRemaining = allEntries[entryIndex - 1].remaining;
      }
      
      for (const entry of subsequentEntries) {
        currentRemaining = currentRemaining - entry.issuedPaper - entry.wastage;
        await PaperStock.findByIdAndUpdate(entry._id, {
          remaining: Math.max(0, currentRemaining),
        });
      }
    }

    return NextResponse.json(
      { message: 'Stock entry deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete paper stock error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
