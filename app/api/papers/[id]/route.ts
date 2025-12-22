import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Paper from '@/models/Paper';
import { requireAuth, getAdminId } from '@/lib/auth';
import { PaperType, PaperUnit } from '@/lib/types';
import { z } from 'zod';

const updatePaperSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  paperType: z.nativeEnum(PaperType),
  paperTypeOther: z.string().optional(),
  paperSize: z.string().min(1, 'Paper size is required'),
  paperWeight: z.string().min(1, 'Paper weight is required'),
  units: z.nativeEnum(PaperUnit),
  originalStock: z.number().min(0, 'Original stock must be 0 or greater').default(0),
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

    const paper = await Paper.findOne({ _id: id, adminId });

    if (!paper) {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ paper }, { status: 200 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Get paper error:', error);
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
    const validatedData = updatePaperSchema.parse(body);

    const paper = await Paper.findOneAndUpdate(
      { _id: id, adminId },
      validatedData,
      { new: true }
    );

    if (!paper) {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Paper updated successfully', paper },
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
    console.error('Update paper error:', error);
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

    const paper = await Paper.findOneAndDelete({ _id: id, adminId });

    if (!paper) {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Paper deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Delete paper error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
