import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PaperStock from '@/models/PaperStock';
import mongoose from 'mongoose';
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
  addedStock: z.number().min(0, 'Added stock must be 0 or greater').optional(),
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

    // Force model registration by accessing the default export
    const JobModel = (await import('@/models/Job')).default;
    void JobModel;

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

    // Get all existing stock entries sorted by date to find the correct insertion position
    const allEntries = await PaperStock.find({ adminId, paperId: validatedData.paperId })
      .sort({ date: 1, createdAt: 1 });
    
    // Find the correct position for this entry based on date
    // Entries should be in chronological order
    let previousRemaining: number;
    let insertPosition = allEntries.length; // Default to end
    const addedStock = validatedData.addedStock || 0;
    
    if (allEntries.length === 0) {
      // No existing entries - start from original stock
      if (addedStock > 0) {
        previousRemaining = paper.originalStock || 0;
      } else {
        previousRemaining = paper.originalStock || 0;
      }
    } else {
      // Find where this entry should be inserted based on date
      // BS dates are in YYYY-MM-DD format, so string comparison works
      for (let i = 0; i < allEntries.length; i++) {
        if (allEntries[i].date > validatedData.date) {
          insertPosition = i;
          break;
        }
      }

      if (insertPosition === 0) {
        // Inserting at the beginning
        previousRemaining = paper.originalStock || 0;
      } else {
        // Inserting after some entries - use the previous entry's remaining
        previousRemaining = allEntries[insertPosition - 1].remaining;
      }
    }

    // Calculate remaining based on the operation type
    let remaining: number;
    if (addedStock > 0) {
      // Adding new stock
      remaining = previousRemaining + addedStock;
    } else {
      // Deducting stock - block if stock would go negative
      const totalDeduct = validatedData.issuedPaper + validatedData.wastage;
      if (previousRemaining < totalDeduct) {
        return NextResponse.json(
          {
            error: `Insufficient paper stock. Available: ${previousRemaining}, required: ${totalDeduct} (issued: ${validatedData.issuedPaper} + wastage: ${validatedData.wastage}). Paper issues are not allowed when stock is not enough.`,
          },
          { status: 400 }
        );
      }
      remaining = previousRemaining - totalDeduct;
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
      addedStock: addedStock > 0 ? addedStock : undefined,
      remaining: Math.max(0, remaining),
      remarks: validatedData.remarks || undefined,
      createdBy: user.email || user.id,
    });

    // Recalculate all subsequent entries to ensure correctness
    // This handles cases where the entry is inserted in the middle
    if (insertPosition < allEntries.length) {
      // Helper function to recalculate all stock entries for a paper
      const recalculateStockForPaper = async () => {
        const allEntriesAfterInsert = await PaperStock.find({ adminId, paperId: validatedData.paperId })
          .sort({ date: 1, createdAt: 1 });

        // Use fresh data from each update
        let previousRemaining = paper.originalStock || 0;

        for (let i = 0; i < allEntriesAfterInsert.length; i++) {
          const entry = allEntriesAfterInsert[i];
          let currentRemaining: number;

          const entryAddedStock = entry.addedStock || 0;
          if (entryAddedStock > 0) {
            // Adding stock
            currentRemaining = previousRemaining + entryAddedStock;
          } else {
            // Deducting stock
            currentRemaining = previousRemaining - entry.issuedPaper - entry.wastage;
          }

          const updatedEntry = await PaperStock.findByIdAndUpdate(
            entry._id,
            {
              remaining: Math.max(0, currentRemaining),
            },
            { new: true } // Return updated document to get fresh data
          );

          // Use the updated remaining value for next iteration
          previousRemaining = updatedEntry?.remaining ?? currentRemaining;
        }
      };

      await recalculateStockForPaper();
    }

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
    // Log full error details for debugging
    console.error('Create paper stock error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
    });
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
