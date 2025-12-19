import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Job from '@/models/Job';
import Client from '@/models/Client';
import Paper from '@/models/Paper';
import Equipment from '@/models/Equipment';
import { requireAuth, getAdminId } from '@/lib/auth';
import { getNextSequenceNumber, CounterName } from '@/lib/counterService';
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
  paperId: z.string().min(1, 'Paper type is required'),
  paperSize: z.string().min(1, 'Paper size is required'),
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
});

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth();
    const adminId = getAdminId(user);

    const jobs = await Job.find({ adminId })
      .populate('clientId', 'clientName')
      .populate('paperId', 'paperName')
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
    await Paper.findOne({ _id: validatedData.paperId, adminId });
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

    const populatedJob = await Job.findById(job._id)
      .populate('clientId', 'clientName')
      .populate('paperId', 'paperName')
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
