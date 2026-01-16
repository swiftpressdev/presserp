import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import Job from '@/models/Job';
import Client from '@/models/Client';
import Paper from '@/models/Paper';
import Equipment from '@/models/Equipment';
import PaperStock from '@/models/PaperStock';
import { requireAuth, getAdminId } from '@/lib/auth';
import { getCurrentBSDate } from '@/lib/dateUtils';
import {
  JobType,
  PlateBy,
  LaminationType,
  BindingType,
  StitchType,
  AdditionalService,
  PlateFarmaType,
  PlateSizeType,
  NormalType,
  PageColorType,
  BookSizeType,
} from '@/lib/types';
import { z } from 'zod';

const updateJobSchema = z.object({
  jobName: z.string().min(1, 'Job name is required'),
  clientId: z.string().min(1, 'Client is required'),
  jobDate: z.string().min(1, 'Job date is required'),
  deliveryDate: z.string().min(1, 'Delivery date is required'),
  jobTypes: z.array(z.nativeEnum(JobType)).min(1, 'At least one job type is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  paperBy: z.enum(['customer', 'company']).optional(),
  paperFrom: z.string().optional(),
  paperFromCustom: z.string().optional(),
  paperIds: z.array(z.string()).optional(),
  paperId: z.string().optional(),
  paperType: z.string().optional(),
  paperSize: z.string().optional(),
  paperWeight: z.string().optional(),
  paperDetails: z.array(z.object({
    paperId: z.string(),
    type: z.string(),
    size: z.string(),
    weight: z.string(),
    paperFrom: z.string(),
    unit: z.string(),
    issuedQuantity: z.number().min(0),
    wastage: z.number().min(0),
  })).optional(),
  totalBWPages: z.number().min(0),
  totalColorPages: z.number().min(0),
  pageColor: z.nativeEnum(PageColorType).optional(),
  pageColorOther: z.string().optional(),
  bookSize: z.nativeEnum(BookSizeType).optional(),
  bookSizeOther: z.string().optional(),
  totalPlate: z.string().optional(),
  totalFarma: z.string().optional(),
  plateBy: z.nativeEnum(PlateBy),
  plateFrom: z.string().optional(),
  plateSize: z.nativeEnum(PlateSizeType).optional(),
  plateSizeOther: z.string().optional(),
  machineId: z.string().min(1, 'Machine is required'),
  laminationThermal: z.nativeEnum(LaminationType).optional(),
  normal: z.nativeEnum(NormalType).optional(),
  folding: z.boolean(),
  binding: z.nativeEnum(BindingType).optional(),
  bindingOther: z.string().optional(),
  stitch: z.nativeEnum(StitchType).optional(),
  stitchOther: z.string().optional(),
  additional: z.array(z.nativeEnum(AdditionalService)).optional(),
  relatedToJobId: z.array(z.string()).optional(),
  remarks: z.string().optional(),
  specialInstructions: z.string().optional(),
}).refine((data) => {
  // If paperBy is 'customer' or 'company' and paperDetails are provided, validate them
  if ((data.paperBy === 'customer' || data.paperBy === 'company') && data.paperDetails && data.paperDetails.length > 0) {
    // Limit to 4 papers maximum
    if (data.paperDetails.length > 4) {
      return false;
    }
    // Validate that all paper details have required fields
    for (const detail of data.paperDetails) {
      if (!detail.type || !detail.size || !detail.weight || !detail.paperFrom || !detail.unit) {
        return false;
      }
      if (detail.issuedQuantity < 0 || detail.wastage < 0) {
        return false;
      }
      // Validate wastage <= issuedQuantity
      if (detail.wastage > detail.issuedQuantity) {
        return false;
      }
    }
    return true;
  }
  // If paperBy is not set, paperId and paperSize are required
  if (!data.paperBy) {
    if (!data.paperId || !data.paperId.trim().length) {
      return false;
    }
    if (!data.paperSize || !data.paperSize.trim().length) {
      return false;
    }
    return true;
  }
  return true;
}, (data) => {
  if ((data.paperBy === 'customer' || data.paperBy === 'company') && data.paperDetails && data.paperDetails.length > 0) {
    // Limit to 4 papers maximum
    if (data.paperDetails.length > 4) {
      return {
        message: 'You can select a maximum of 4 papers',
        path: ['paperDetails'],
      };
    }
    for (const detail of data.paperDetails) {
      if (!detail.type || !detail.size || !detail.weight || !detail.paperFrom || !detail.unit) {
        return {
          message: 'All paper detail fields are required',
          path: ['paperDetails'],
        };
      }
      // Validate wastage <= issuedQuantity
      if (detail.wastage > detail.issuedQuantity) {
        return {
          message: `Wastage (${detail.wastage}) cannot be more than issued quantity (${detail.issuedQuantity}) for paper: ${detail.type} - ${detail.size}`,
          path: ['paperDetails'],
        };
      }
    }
  }
  if (!data.paperBy && !data.paperId) {
    return {
      message: 'Paper ID is required',
      path: ['paperId'],
    };
  }
  if (!data.paperBy && (!data.paperSize || !data.paperSize.trim().length)) {
    return {
      message: 'Paper size is required',
      path: ['paperSize'],
    };
  }
  return {};
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    // Ensure all models are registered before use
    if (!mongoose.models.Client) {
      await import('@/models/Client');
    }
    if (!mongoose.models.Paper) {
      await import('@/models/Paper');
    }
    if (!mongoose.models.Equipment) {
      await import('@/models/Equipment');
    }
    if (!mongoose.models.Job) {
      await import('@/models/Job');
    }
    
    const user = await requireAuth();
    const adminId = getAdminId(user);
    const { id } = await params;

    const job = await Job.findOne({ _id: id, adminId })
      .populate('clientId', 'clientName address')
      .populate('paperId', 'clientName paperType paperTypeOther paperSize paperWeight units')
      .populate('paperIds', 'clientName paperType paperTypeOther paperSize paperWeight units')
      .populate('machineId', 'equipmentName')
      .populate('relatedToJobId', 'jobNo jobName');

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ job }, { status: 200 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Get job error:', error);
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
    
    // Ensure all models are registered before use
    if (!mongoose.models.Client) {
      await import('@/models/Client');
    }
    if (!mongoose.models.Paper) {
      await import('@/models/Paper');
    }
    if (!mongoose.models.Equipment) {
      await import('@/models/Equipment');
    }
    if (!mongoose.models.Job) {
      await import('@/models/Job');
    }
    
    const user = await requireAuth();
    const adminId = getAdminId(user);
    const { id } = await params;

    const body = await request.json();
    const validatedData = updateJobSchema.parse(body);

    // Validate paperId only if it's provided (not when using paperIds)
    if (validatedData.paperId) {
      await Paper.findOne({ _id: validatedData.paperId, adminId });
    }
    // Validate paperIds if provided
    if (validatedData.paperIds && validatedData.paperIds.length > 0) {
      for (const paperId of validatedData.paperIds) {
        await Paper.findOne({ _id: paperId, adminId });
      }
    }

    const totalPages = validatedData.totalBWPages + validatedData.totalColorPages;

    // Get existing job to check if paperIds changed
    const existingJob = await Job.findOne({ _id: id, adminId });
    if (!existingJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Validate stock availability before updating job
    if ((validatedData.paperBy === 'customer' || validatedData.paperBy === 'company') && validatedData.paperDetails && validatedData.paperDetails.length > 0) {
      const existingPaperDetails = (existingJob.paperDetails as any[]) || [];
      const newPaperDetails = validatedData.paperDetails;
      
      // Create a map of old paper details for quick lookup
      const oldPaperMap = new Map(
        existingPaperDetails.map(p => [p.paperId, { issued: p.issuedQuantity || 0, wastage: p.wastage || 0 }])
      );

      for (const paperDetail of newPaperDetails) {
        const paperId = paperDetail.paperId;
        const issuedPaper = paperDetail.issuedQuantity || 0;
        const wastage = paperDetail.wastage || 0;
        const totalRequired = issuedPaper + wastage;

        // Get current remaining stock for this paper
        const stockEntries = await PaperStock.find({ adminId, paperId })
          .sort({ date: 1, createdAt: 1 });
        
        const paper = await Paper.findById(paperId);
        if (!paper) {
          return NextResponse.json(
            { error: `Paper not found for paper ID: ${paperId}` },
            { status: 404 }
          );
        }

        // Calculate current remaining stock
        let currentRemaining: number;
        if (stockEntries.length === 0) {
          currentRemaining = paper.originalStock || 0;
        } else {
          currentRemaining = stockEntries[stockEntries.length - 1].remaining;
        }

        // If this paper was already used in the job, add back the old issued quantity and wastage
        // because we'll restore it before deducting the new amount
        const oldPaperData = oldPaperMap.get(paperId);
        if (oldPaperData) {
          // This paper was in the old job - we'll restore it first, so add it back
          currentRemaining = currentRemaining + oldPaperData.issued + oldPaperData.wastage;
        }

        // Check if there's enough stock (after restoration, before new deduction)
        if (currentRemaining < totalRequired) {
          const paperInfo = `${paper.paperType === 'Other' && paper.paperTypeOther ? paper.paperTypeOther : paper.paperType} - ${paper.paperSize} - ${paper.paperWeight}`;
          return NextResponse.json(
            { error: `Insufficient stock for paper: ${paperInfo}. Available: ${currentRemaining}, Required: ${totalRequired} (Issued: ${issuedPaper} + Wastage: ${wastage})` },
            { status: 400 }
          );
        }
      }
    }

    const job = await Job.findOneAndUpdate(
      { _id: id, adminId },
      {
        ...validatedData,
        totalPages,
      },
      { new: true }
    ).populate('clientId', 'clientName address')
     .populate('paperId', 'clientName paperType paperTypeOther paperSize paperWeight units')
     .populate('paperIds', 'clientName paperType paperTypeOther paperSize paperWeight units')
     .populate('machineId', 'equipmentName')
     .populate('relatedToJobId', 'jobNo jobName');

    // Validate job was updated successfully
    if (!job || !job._id) {
      return NextResponse.json(
        { error: 'Failed to update job' },
        { status: 500 }
      );
    }

    // Handle stock updates when paperBy is 'customer' or 'company'
    const jobDate = validatedData.jobDate || getCurrentBSDate();
    const existingPaperDetails = (existingJob.paperDetails as any[]) || [];
    const newPaperDetails = (validatedData.paperBy === 'customer' || validatedData.paperBy === 'company') 
      ? (validatedData.paperDetails || []) 
      : [];

    // Helper function to recalculate all stock entries for a paper after a change
    const recalculateStockForPaper = async (paperId: string) => {
      const Paper = (await import('@/models/Paper')).default;
      const paper = await Paper.findById(paperId);
      if (!paper) return;

      // Get all entries sorted by date
      const allEntries = await PaperStock.find({ adminId, paperId })
        .sort({ date: 1, createdAt: 1 });
      
      if (allEntries.length === 0) return;

      // Recalculate all entries sequentially, using fresh data from each update
      let previousRemaining = paper.originalStock || 0;
      
      for (let i = 0; i < allEntries.length; i++) {
        const entry = allEntries[i];
        let currentRemaining: number;

        const addedStock = entry.addedStock || 0;
        if (addedStock > 0) {
          // Adding stock
          currentRemaining = previousRemaining + addedStock;
        } else {
          // Deducting stock
          currentRemaining = previousRemaining - entry.issuedPaper - entry.wastage;
        }

        const updatedEntry = await PaperStock.findByIdAndUpdate(
          entry._id,
          {
            remaining: Math.max(0, currentRemaining),
          },
          { new: true } // Return the updated document to get fresh data
        );

        // Use the updated remaining value for next iteration
        previousRemaining = updatedEntry?.remaining || currentRemaining;
      }
    };

    // Helper function to restore stock for a removed paper
    const restoreStockForPaper = async (paperId: string, originalIssued: number, originalWastage: number) => {
      // Validate job._id exists
      if (!job || !job._id) {
        throw new Error('Job ID is required for stock restoration');
      }

      // Find the stock entry for this job and paper
      const existingStockEntry = await PaperStock.findOne({ 
        adminId, 
        paperId,
        jobId: job._id.toString()
      });

      if (existingStockEntry) {
        // Delete the stock entry that was created for this job
        await PaperStock.findByIdAndDelete(existingStockEntry._id);
        // Recalculate all subsequent entries for this paper
        await recalculateStockForPaper(paperId);
      }
    };

    // Helper function to create or update stock entry
    const updateStockEntry = async (paperId: string, issuedPaper: number, wastage: number) => {
      // Validate job._id exists
      if (!job || !job._id) {
        throw new Error('Job ID is required for stock update');
      }

      // Find existing stock entry for this job and paper
      const existingStockEntry = await PaperStock.findOne({ 
        adminId, 
        paperId,
        jobId: job._id.toString()
      });

      if (existingStockEntry) {
        // Update existing entry - first restore it, then apply new values
        await restoreStockForPaper(paperId, existingStockEntry.issuedPaper, existingStockEntry.wastage);
        // Now create new entry with updated values
        await createStockEntry(paperId, issuedPaper, wastage);
      } else {
        // Create new entry
        await createStockEntry(paperId, issuedPaper, wastage);
      }
    };

    // Helper function to create a new stock entry
    const createStockEntry = async (paperId: string, issuedPaper: number, wastage: number) => {
      const Paper = (await import('@/models/Paper')).default;
      const paper = await Paper.findById(paperId);
      if (!paper) {
        throw new Error(`Paper not found for paper ID: ${paperId}`);
      }

      // Get all stock entries sorted by date to find the correct position
      const stockEntries = await PaperStock.find({ adminId, paperId })
        .sort({ date: 1, createdAt: 1 });
      
      // Find the correct position for this entry based on jobDate
      // Entries should be in chronological order
      let previousRemaining: number;
      let insertPosition = stockEntries.length; // Default to end

      if (stockEntries.length === 0) {
        previousRemaining = paper.originalStock || 0;
      } else {
        // Find where this entry should be inserted based on date
        // BS dates are in YYYY-MM-DD format, so string comparison works
        for (let i = 0; i < stockEntries.length; i++) {
          if (stockEntries[i].date > jobDate) {
            insertPosition = i;
            break;
          }
        }

        if (insertPosition === 0) {
          // Inserting at the beginning
          previousRemaining = paper.originalStock || 0;
        } else {
          // Inserting after some entries - use the previous entry's remaining
          previousRemaining = stockEntries[insertPosition - 1].remaining;
        }
      }

      const remaining = previousRemaining - issuedPaper - wastage;

      // Validate job._id exists before creating stock entry
      if (!job || !job._id) {
        throw new Error('Job ID is required for stock entry creation');
      }

      // Create stock entry
      await PaperStock.create({
        adminId,
        paperId,
        date: jobDate,
        jobNo: existingJob.jobNo,
        jobName: validatedData.jobName,
        jobId: job._id,
        issuedPaper,
        wastage,
        remaining: Math.max(0, remaining),
        remarks: `Auto-deducted for job ${existingJob.jobNo}`,
        createdBy: user.email || user.id,
      });

      // Always recalculate all entries to ensure correctness
      // This handles cases where the entry is inserted in the middle
      await recalculateStockForPaper(paperId);
    };

    // Step 1: Determine which papers need to be restored
    const oldPaperBy = existingJob.paperBy || (existingPaperDetails.length > 0 ? 'customer' : '');
    const newPaperBy = validatedData.paperBy || '';
    
    // Check if paperBy changed from customer/company to something else
    const paperByChangedAway = (oldPaperBy === 'customer' || oldPaperBy === 'company') && 
                                newPaperBy !== 'customer' && newPaperBy !== 'company';
    
    if (paperByChangedAway && existingPaperDetails.length > 0) {
      // paperBy changed away from customer/company - restore all old papers
      for (const oldPaperDetail of existingPaperDetails) {
        await restoreStockForPaper(
          oldPaperDetail.paperId,
          oldPaperDetail.issuedQuantity || 0,
          oldPaperDetail.wastage || 0
        );
      }
    } else if (newPaperBy === 'customer' || newPaperBy === 'company') {
      // paperBy is still customer/company - restore only removed papers
      for (const oldPaperDetail of existingPaperDetails) {
        const stillExists = newPaperDetails.some(
          (newDetail) => newDetail.paperId === oldPaperDetail.paperId
        );

        if (!stillExists) {
          // This paper was removed - restore its stock
          await restoreStockForPaper(
            oldPaperDetail.paperId,
            oldPaperDetail.issuedQuantity || 0,
            oldPaperDetail.wastage || 0
          );
        }
      }
    }

    // Step 3: Create/update stock entries for new papers
    // (papers in newPaperDetails)
    if (newPaperDetails.length > 0) {
      for (const paperDetail of newPaperDetails) {
        const paperId = paperDetail.paperId;
        const issuedPaper = paperDetail.issuedQuantity || 0;
        const wastage = paperDetail.wastage || 0;

        // Find if this paper existed in the old job
        const oldPaperDetail = existingPaperDetails.find(
          (old) => old.paperId === paperId
        );

        if (oldPaperDetail) {
          // Paper still exists but quantities might have changed
          const oldIssued = oldPaperDetail.issuedQuantity || 0;
          const oldWastage = oldPaperDetail.wastage || 0;

          if (oldIssued !== issuedPaper || oldWastage !== wastage) {
            // Quantities changed - update stock entry
            await updateStockEntry(paperId, issuedPaper, wastage);
          }
          // If quantities are the same, no need to update
        } else {
          // New paper - create stock entry
          await createStockEntry(paperId, issuedPaper, wastage);
        }
      }
    }

    return NextResponse.json(
      { message: 'Job updated successfully', job },
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
    // Log full error details for debugging
    console.error('Update job error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
    });
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
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
    
    // Ensure all models are registered before use
    if (!mongoose.models.Paper) {
      await import('@/models/Paper');
    }
    if (!mongoose.models.PaperStock) {
      await import('@/models/PaperStock');
    }
    if (!mongoose.models.Job) {
      await import('@/models/Job');
    }
    
    const user = await requireAuth();
    const adminId = getAdminId(user);
    const { id } = await params;

    // Get the job before deleting to check for stock entries
    const job = await Job.findOne({ _id: id, adminId });
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Restore stock for all papers used in this job
    const existingPaperDetails = (job.paperDetails as any[]) || [];
    if ((job.paperBy === 'customer' || job.paperBy === 'company') && existingPaperDetails.length > 0) {
      // Helper function to recalculate all stock entries for a paper after a change
      const recalculateStockForPaper = async (paperId: string) => {
        const Paper = (await import('@/models/Paper')).default;
        const paper = await Paper.findById(paperId);
        if (!paper) return;

        // Get all entries sorted by date
        const allEntries = await PaperStock.find({ adminId, paperId })
          .sort({ date: 1, createdAt: 1 });
        
        if (allEntries.length === 0) return;

        // Recalculate all entries sequentially, using fresh data from each update
        let previousRemaining = paper.originalStock || 0;
        
        for (let i = 0; i < allEntries.length; i++) {
          const entry = allEntries[i];
          let currentRemaining: number;

          const addedStock = entry.addedStock || 0;
          if (addedStock > 0) {
            // Adding stock
            currentRemaining = previousRemaining + addedStock;
          } else {
            // Deducting stock
            currentRemaining = previousRemaining - entry.issuedPaper - entry.wastage;
          }

          const updatedEntry = await PaperStock.findByIdAndUpdate(
            entry._id,
            {
              remaining: Math.max(0, currentRemaining),
            },
            { new: true } // Return the updated document to get fresh data
          );

          // Use the updated remaining value for next iteration
          previousRemaining = updatedEntry?.remaining || currentRemaining;
        }
      };

      // Restore stock for each paper used in the job
      for (const paperDetail of existingPaperDetails) {
        const paperId = paperDetail.paperId;
        
        // Delete all stock entries associated with this job
        const deletedCount = await PaperStock.deleteMany({ 
          adminId, 
          paperId,
          jobId: id.toString()
        });

        // If any entries were deleted, recalculate subsequent entries
        if (deletedCount.deletedCount > 0) {
          await recalculateStockForPaper(paperId);
        }
      }
    }

    // Now delete the job
    await Job.findByIdAndDelete(id);

    return NextResponse.json(
      { message: 'Job deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    // Log full error details for debugging
    console.error('Delete job error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
    });
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
