import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Paper from '@/models/Paper';
import { requireAuth, getAdminId } from '@/lib/auth';
import { PaperType, PaperUnit } from '@/lib/types';
import { z } from 'zod';

const paperSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  paperType: z.nativeEnum(PaperType),
  paperTypeOther: z.string().optional(),
  paperSize: z.string().min(1, 'Paper size is required'),
  paperWeight: z.string().min(1, 'Paper weight is required'),
  units: z.nativeEnum(PaperUnit),
  originalStock: z.number().min(0, 'Original stock must be 0 or greater').default(0),
});

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth();
    const adminId = getAdminId(user);

    const papers = await Paper.find({ adminId }).sort({ createdAt: -1 });

    // Calculate remaining stock for each paper
    const PaperStock = (await import('@/models/PaperStock')).default;
    const papersWithRemainingStock = await Promise.all(
      papers.map(async (paper) => {
        const stockEntries = await PaperStock.find({ adminId, paperId: paper._id })
          .sort({ date: 1, createdAt: 1 });
        
        const remainingStock = stockEntries.length > 0
          ? stockEntries[stockEntries.length - 1].remaining
          : paper.originalStock;

        return {
          ...paper.toObject(),
          remainingStock,
        };
      })
    );

    return NextResponse.json({ papers: papersWithRemainingStock }, { status: 200 });
  } catch (error: any) {
    console.error('Get papers error:', error);
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
    const validatedData = paperSchema.parse(body);

    const paper = await Paper.create({
      ...validatedData,
      adminId,
      createdBy: user.email,
    });

    return NextResponse.json(
      { message: 'Paper created successfully', paper },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create paper error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
