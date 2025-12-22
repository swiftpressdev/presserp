import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
// Import models to ensure they're registered
import '@/models/Client';
import '@/models/Job';
import ChallanReport from '@/models/ChallanReport';
import Challan from '@/models/Challan';
import { requireAuth, getAdminId } from '@/lib/auth';
import { z } from 'zod';

const challanReportSchema = z.object({
  reportName: z.string().min(1, 'Report name is required'),
  filterType: z.enum(['client', 'particular']),
  clientId: z.string().optional(),
  particularName: z.string().optional(),
  finalOrder: z.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth();
    const adminId = getAdminId(user);

    const reports = await ChallanReport.find({ adminId })
      .populate('clientId', 'clientName')
      .sort({ createdAt: -1 });

    return NextResponse.json({ reports }, { status: 200 });
  } catch (error: any) {
    console.error('Get challan reports error:', error);
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
    const validatedData = challanReportSchema.parse(body);

    // Fetch challan data based on filter
    let reportData: any[] = [];
    let totalIssued = 0;

    if (validatedData.filterType === 'client' && validatedData.clientId) {
      // Fetch all challans for this client
      const challans = await Challan.find({ 
        adminId, 
        clientId: validatedData.clientId 
      })
        .populate('jobId', 'jobNo')
        .sort({ challanDate: -1 });

      // Extract particulars from challans
      for (const challan of challans) {
        for (const particular of challan.particulars) {
          reportData.push({
            date: challan.challanDate,
            jobNo: typeof challan.jobId === 'object' && challan.jobId ? challan.jobId.jobNo : 'N/A',
            challanNo: challan.challanNumber,
            particulars: particular.particulars,
            quantity: particular.quantity,
            remarks: challan.remarks || '',
          });
          totalIssued += particular.quantity;
        }
      }
    } else if (validatedData.filterType === 'particular' && validatedData.particularName) {
      // Fetch all challans to filter by exact particular name match
      const challans = await Challan.find({ adminId })
        .populate('jobId', 'jobNo')
        .sort({ challanDate: -1 });

      // Normalize the search term for exact matching (case-insensitive, trimmed)
      const searchTerm = validatedData.particularName.toLowerCase().trim();

      // Extract matching particulars from challans (exact match, case-insensitive)
      for (const challan of challans) {
        for (const particular of challan.particulars) {
          // Exact match: case-insensitive comparison
          if (particular.particulars.toLowerCase().trim() === searchTerm) {
            reportData.push({
              date: challan.challanDate,
              jobNo: typeof challan.jobId === 'object' && challan.jobId ? challan.jobId.jobNo : 'N/A',
              challanNo: challan.challanNumber,
              particulars: particular.particulars,
              quantity: particular.quantity,
              remarks: challan.remarks || '',
            });
            totalIssued += particular.quantity;
          }
        }
      }
    }

    const report = await ChallanReport.create({
      adminId,
      reportName: validatedData.reportName,
      filterType: validatedData.filterType,
      clientId: validatedData.clientId || undefined,
      particularName: validatedData.particularName || undefined,
      finalOrder: validatedData.finalOrder || 0,
      totalIssued,
      reportData,
      lastUpdated: new Date(),
      createdBy: user.email || user.id,
    });

    return NextResponse.json(
      { message: 'Challan report created successfully', report },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create challan report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
