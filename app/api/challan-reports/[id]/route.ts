import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
// Import models to ensure they're registered
import '@/models/Client';
import '@/models/Job';
import ChallanReport from '@/models/ChallanReport';
import Challan from '@/models/Challan';
import { requireAuth, getAdminId } from '@/lib/auth';
import { z } from 'zod';

const updateChallanReportSchema = z.object({
  reportName: z.string().min(1, 'Report name is required').optional(),
  finalOrder: z.number().optional(),
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

    const report = await ChallanReport.findOne({ _id: id, adminId })
      .populate('clientId', 'clientName');

    if (!report) {
      return NextResponse.json(
        { error: 'Challan report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ report }, { status: 200 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Get challan report error:', error);
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

    // Check if this is an update request
    if (body.action === 'update-data') {
      // Fetch the report
      const report = await ChallanReport.findOne({ _id: id, adminId });
      
      if (!report) {
        return NextResponse.json({ error: 'Challan report not found' }, { status: 404 });
      }

      // Refresh data based on filter
      let reportData: any[] = [];
      let totalIssued = 0;

      if (report.filterType === 'client' && report.clientId) {
        const challans = await Challan.find({ 
          adminId, 
          clientId: report.clientId 
        })
          .populate('jobId', 'jobNo')
          .sort({ challanDate: -1 });

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
      } else if (report.filterType === 'particular' && report.particularName) {
        const challans = await Challan.find({ 
          adminId,
          'particulars.particulars': { $regex: report.particularName, $options: 'i' }
        })
          .populate('jobId', 'jobNo')
          .sort({ challanDate: -1 });

        for (const challan of challans) {
          for (const particular of challan.particulars) {
            if (particular.particulars.toLowerCase().includes(report.particularName.toLowerCase())) {
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

      const updatedReport = await ChallanReport.findOneAndUpdate(
        { _id: id, adminId },
        {
          reportData,
          totalIssued,
          lastUpdated: new Date(),
        },
        { new: true }
      ).populate('clientId', 'clientName');

      return NextResponse.json(
        { message: 'Challan report data updated successfully', report: updatedReport },
        { status: 200 }
      );
    } else {
      // Regular update (name, finalOrder)
      const validatedData = updateChallanReportSchema.parse(body);

      const updatedReport = await ChallanReport.findOneAndUpdate(
        { _id: id, adminId },
        validatedData,
        { new: true }
      ).populate('clientId', 'clientName');

      if (!updatedReport) {
        return NextResponse.json({ error: 'Challan report not found' }, { status: 404 });
      }

      return NextResponse.json(
        { message: 'Challan report updated successfully', report: updatedReport },
        { status: 200 }
      );
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update challan report error:', error);
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
    const report = await ChallanReport.findOneAndDelete({ _id: id, adminId });

    if (!report) {
      return NextResponse.json({ error: 'Challan report not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Challan report deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete challan report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
