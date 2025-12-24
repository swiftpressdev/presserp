import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
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
  relatedToJobId: z.string().optional(),
  remarks: z.string().optional(),
  specialInstructions: z.string().optional(),
}).refine((data) => {
  // If paperBy is 'customer' and paperDetails are provided, validate them
  if (data.paperBy === 'customer' && data.paperDetails && data.paperDetails.length > 0) {
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
  // If paperBy is 'company', paperFromCustom is required (no paperId/paperSize needed)
  if (data.paperBy === 'company') {
    return !!(data.paperFromCustom && data.paperFromCustom.trim().length > 0);
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
  if (data.paperBy === 'customer' && data.paperDetails && data.paperDetails.length > 0) {
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
  if (data.paperBy === 'company' && (!data.paperFromCustom || !data.paperFromCustom.trim().length)) {
    return {
      message: 'Page From (Custom) is required when paper is from company',
      path: ['paperFromCustom'],
    };
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

    // Validate stock availability before updating job (only if paper details changed)
    if (validatedData.paperBy === 'customer' && validatedData.paperDetails && validatedData.paperDetails.length > 0) {
      const existingPaperDetails = (existingJob.paperDetails as any[]) || [];
      const paperDetailsChanged = JSON.stringify(existingPaperDetails) !== JSON.stringify(validatedData.paperDetails);
      
      // Only validate stock if paper details changed
      if (paperDetailsChanged) {
        for (const paperDetail of validatedData.paperDetails) {
          const paperId = paperDetail.paperId;
          // Get current remaining stock for this paper
          const stockEntries = await PaperStock.find({ adminId, paperId })
            .sort({ date: -1, createdAt: -1 })
            .limit(1);
          
          const paper = await Paper.findById(paperId);
          if (!paper) {
            return NextResponse.json(
              { error: `Paper not found for paper ID: ${paperId}` },
              { status: 404 }
            );
          }

          const currentRemaining = stockEntries.length > 0 
            ? stockEntries[0].remaining 
            : (paper.originalStock || 0);

          const issuedPaper = paperDetail.issuedQuantity || 0;
          const wastage = paperDetail.wastage || 0;
          const totalRequired = issuedPaper + wastage;

          // Check if there's enough stock
          if (currentRemaining < totalRequired) {
            const paperInfo = `${paper.paperType === 'Other' && paper.paperTypeOther ? paper.paperTypeOther : paper.paperType} - ${paper.paperSize} - ${paper.paperWeight}`;
            return NextResponse.json(
              { error: `Insufficient stock for paper: ${paperInfo}. Available: ${currentRemaining}, Required: ${totalRequired} (Issued: ${issuedPaper} + Wastage: ${wastage})` },
              { status: 400 }
            );
          }
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

    // Deduct stock if paperBy is 'customer' and paperDetails are provided
    if (validatedData.paperBy === 'customer' && validatedData.paperDetails && validatedData.paperDetails.length > 0) {
      const existingPaperDetails = (existingJob.paperDetails as any[]) || [];
      
      // Check if paper details changed
      const paperDetailsChanged = JSON.stringify(existingPaperDetails) !== JSON.stringify(validatedData.paperDetails);
      
      // Only create new stock entries if paper details changed
      if (paperDetailsChanged) {
        const jobDate = validatedData.jobDate || getCurrentBSDate();
        
        for (const paperDetail of validatedData.paperDetails) {
          const paperId = paperDetail.paperId;
          // Get current remaining stock for this paper
          const stockEntries = await PaperStock.find({ adminId, paperId })
            .sort({ date: -1, createdAt: -1 })
            .limit(1);
          
          const paper = await Paper.findById(paperId);
          const currentRemaining = stockEntries.length > 0 
            ? stockEntries[0].remaining 
            : (paper?.originalStock || 0);

          const issuedPaper = paperDetail.issuedQuantity || 0;
          const wastage = paperDetail.wastage || 0;
          const remaining = currentRemaining - issuedPaper - wastage;

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
            remaining: Math.max(0, remaining), // Ensure non-negative
            remarks: `Auto-deducted for job ${existingJob.jobNo}`,
            createdBy: user.email || user.id,
          });
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
    console.error('Update job error:', error);
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

    const job = await Job.findOneAndDelete({ _id: id, adminId });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Job deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Delete job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
