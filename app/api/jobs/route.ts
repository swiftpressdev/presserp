import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Job from '@/models/Job';
import Client from '@/models/Client';
import Paper from '@/models/Paper';
import Equipment from '@/models/Equipment';
import PaperStock from '@/models/PaperStock';
import { requireAuth, getAdminId } from '@/lib/auth';
import { getNextSequenceNumber, CounterName } from '@/lib/counterService';
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

const jobSchema = z.object({
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
  paperSize: z.string().min(1, 'Paper size is required'),
  paperWeight: z.string().optional(),
  totalBWPages: z.number().min(1, 'Total B/W Pages must be at least 1'),
  totalColorPages: z.number().min(1, 'Total Color Pages must be at least 1'),
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
  // If paperBy is 'customer' and paperIds are provided, paperType is required
  if (data.paperBy === 'customer' && data.paperIds && data.paperIds.length > 0) {
    return !!(data.paperType && data.paperType.trim().length > 0);
  }
  // If paperBy is 'company' or not set, paperId is required
  if (data.paperBy !== 'customer') {
    return !!(data.paperId && data.paperId.trim().length > 0);
  }
  // If paperBy is not set, paperId is required
  if (!data.paperBy) {
    return !!(data.paperId && data.paperId.trim().length > 0);
  }
  return true;
}, (data) => {
  if (data.paperBy === 'customer' && data.paperIds && data.paperIds.length > 0) {
    return {
      message: 'Paper type is required when selecting customer papers',
      path: ['paperType'],
    };
  }
  return {
    message: 'Paper selection is required',
    path: ['paperId'],
  };
});

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth();
    const adminId = getAdminId(user);

    const jobs = await Job.find({ adminId })
      .populate('clientId', 'clientName address')
      .populate('paperId', 'clientName paperType paperSize paperWeight')
      .populate('paperIds', 'clientName paperType paperSize paperWeight')
      .populate('machineId', 'equipmentName')
      .populate('relatedToJobId', 'jobNo')
      .sort({ createdAt: -1 });

    return NextResponse.json({ jobs }, { status: 200 });
  } catch (error: any) {
    console.error('Get jobs error:', error);
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
    const validatedData = jobSchema.parse(body);

    await Client.findOne({ _id: validatedData.clientId, adminId });
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
    await Equipment.findOne({ _id: validatedData.machineId, adminId });

    const jobNo = await getNextSequenceNumber(adminId, CounterName.JOB);

    const totalPages = validatedData.totalBWPages + validatedData.totalColorPages;

    const job = await Job.create({
      ...validatedData,
      jobNo,
      totalPages,
      adminId,
      createdBy: user.email,
    });

    // Deduct stock if paperBy is 'customer' and paperIds are provided (company papers being used)
    if (validatedData.paperBy === 'customer' && validatedData.paperIds && validatedData.paperIds.length > 0) {
      const jobDate = validatedData.jobDate || getCurrentBSDate();
      
      for (const paperId of validatedData.paperIds) {
        // Get current remaining stock for this paper
        const stockEntries = await PaperStock.find({ adminId, paperId })
          .sort({ date: -1, createdAt: -1 })
          .limit(1);
        
        const paper = await Paper.findById(paperId);
        const currentRemaining = stockEntries.length > 0 
          ? stockEntries[0].remaining 
          : (paper?.originalStock || 0);

        const issuedPaper = totalPages;
        const wastage = 0; // Can be updated later
        const remaining = currentRemaining - issuedPaper - wastage;

        // Create stock entry
        await PaperStock.create({
          adminId,
          paperId,
          date: jobDate,
          jobNo: jobNo,
          jobName: validatedData.jobName,
          jobId: job._id,
          issuedPaper,
          wastage,
          remaining: Math.max(0, remaining), // Ensure non-negative
          remarks: `Auto-deducted for job ${jobNo}`,
          createdBy: user.email || user.id,
        });
      }
    }

    const populatedJob = await Job.findById(job._id)
      .populate('clientId', 'clientName address')
      .populate('paperId', 'clientName paperType paperTypeOther paperSize paperWeight')
      .populate('paperIds', 'clientName paperType paperTypeOther paperSize paperWeight')
      .populate('machineId', 'equipmentName');

    return NextResponse.json(
      { message: 'Job created successfully', job: populatedJob },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create job error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
