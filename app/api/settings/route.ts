import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import User from '@/models/User';
import { requireAdmin, getAdminId } from '@/lib/auth';
import { z } from 'zod';

const defaultParticularSchema = z.object({
  particularName: z.string(),
  unit: z.string(),
  quantity: z.coerce.number().min(0, 'Quantity must be at least 0'),
  rate: z.coerce.number().min(0, 'Rate must be at least 0'),
});

const settingsSchema = z.object({
  quotationPrefix: z.string().min(1, 'Quotation prefix is required'),
  jobPrefix: z.string().min(1, 'Job prefix is required'),
  estimatePrefix: z.string().min(1, 'Estimate prefix is required'),
  challanPrefix: z.string().min(1, 'Challan prefix is required'),
  companyName: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().optional(),
  regdNo: z.string().optional(),
  companyLogo: z.string().optional(),
  companyLogoPublicId: z.string().optional(),
  companyStamp: z.string().optional(),
  companyStampPublicId: z.string().optional(),
  letterhead: z.string().optional(),
  letterheadPublicId: z.string().optional(),
  esignature: z.string().optional(),
  esignaturePublicId: z.string().optional(),
  companyLogoUseIn: z.array(z.string()).optional(),
  companyStampUseIn: z.array(z.string()).optional(),
  letterheadUseIn: z.array(z.string()).optional(),
  esignatureUseIn: z.array(z.string()).optional(),
  defaultParticulars: z.array(defaultParticularSchema).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const admin = await requireAdmin();
    const adminId = getAdminId(admin);

    let settings = await Settings.findOne({ adminId });

    if (!settings) {
      settings = await Settings.create({
        adminId,
        quotationPrefix: 'Q',
        jobPrefix: 'J',
        estimatePrefix: 'E',
        challanPrefix: 'C',
        defaultParticulars: [],
      });
    }

    // Also get users count
    const usersCount = await User.countDocuments({ adminId });

    return NextResponse.json({ settings, usersCount }, { status: 200 });
  } catch (error: any) {
    console.error('Get settings error:', error);
    if (error.message === 'Unauthorized' || error.message === 'Admin access required') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const admin = await requireAdmin();
    const adminId = getAdminId(admin);

    const body = await request.json();
    
    // Filter out empty default particulars before validation
    if (body.defaultParticulars && Array.isArray(body.defaultParticulars)) {
      body.defaultParticulars = body.defaultParticulars.filter(
        (dp: any) => dp.particularName && dp.particularName.trim() !== ''
      );
    }
    
    const validatedData = settingsSchema.parse(body);

    const settings = await Settings.findOneAndUpdate(
      { adminId },
      validatedData,
      { new: true, upsert: true }
    );

    return NextResponse.json(
      { message: 'Settings updated successfully', settings },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === 'Unauthorized' || error.message === 'Admin access required') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
