import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import { requireAdmin, getAdminId } from '@/lib/auth';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

// File size limits in bytes
const LETTERHEAD_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const OTHER_ASSETS_MAX_SIZE = 1 * 1024 * 1024; // 1MB

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const adminId = getAdminId(admin);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const assetType = formData.get('assetType') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!assetType) {
      return NextResponse.json({ error: 'Asset type is required' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only image files are allowed (JPEG, PNG, WebP, GIF)' },
        { status: 400 }
      );
    }

    // Validate file size based on asset type
    const maxSize = assetType === 'letterhead' ? LETTERHEAD_MAX_SIZE : OTHER_ASSETS_MAX_SIZE;
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${maxSizeMB}MB` },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get existing settings to check for old image
    const settings = await Settings.findOne({ adminId });
    const publicIdField = `${assetType}PublicId` as keyof typeof settings;
    const oldPublicId = settings?.[publicIdField] as string | undefined;

    // Generate consistent public_id for this asset type (enables override)
    const publicId = `presserp/${adminId}/${assetType}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary with optimization
    // Optimizations:
    // - Letterhead: max 2000x2000, quality 85 (needs higher quality for letterhead)
    // - Other assets: max 1000x1000, quality 80 (smaller for logos/stamps/signatures)
    const uploadOptions =
      assetType === 'letterhead'
        ? {
            folder: `presserp/${adminId}`,
            maxWidth: 2000,
            maxHeight: 2000,
            quality: 85,
            format: 'auto' as const,
            publicId, // Same public_id = override existing image
          }
        : {
            folder: `presserp/${adminId}`,
            maxWidth: 1000,
            maxHeight: 1000,
            quality: 80,
            format: 'auto' as const,
            publicId, // Same public_id = override existing image
          };

    const result = await uploadImage(buffer, uploadOptions);

    // Delete old image if it exists and has different public_id
    if (oldPublicId && oldPublicId !== publicId) {
      await deleteImage(oldPublicId);
    }

    // Update settings with new URL and public_id
    const updateField = assetType as keyof typeof settings;
    await Settings.findOneAndUpdate(
      { adminId },
      {
        [updateField]: result.secure_url,
        [publicIdField]: result.public_id,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(
      {
        message: 'Asset uploaded successfully',
        url: result.secure_url,
        publicId: result.public_id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Admin access required') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Upload asset error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload asset' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const adminId = getAdminId(admin);

    const { searchParams } = new URL(request.url);
    const assetType = searchParams.get('assetType') as string | null;

    if (!assetType) {
      return NextResponse.json(
        { error: 'Asset type is required' },
        { status: 400 }
      );
    }

    const validAssetTypes = ['companyLogo', 'companyStamp', 'letterhead', 'esignature'];
    if (!validAssetTypes.includes(assetType)) {
      return NextResponse.json(
        { error: 'Invalid asset type' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get existing settings to find the public_id
    const settings = await Settings.findOne({ adminId });
    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 }
      );
    }

    const publicIdField = `${assetType}PublicId` as keyof typeof settings;
    const publicId = settings[publicIdField] as string | undefined;

    if (!publicId) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Delete from Cloudinary using the optimization strategy
    await deleteImage(publicId);

    // Clear the asset URL and public_id from database
    const updateField = assetType as keyof typeof settings;
    await Settings.findOneAndUpdate(
      { adminId },
      {
        $unset: {
          [updateField]: 1,
          [publicIdField]: 1,
        },
      },
      { new: true }
    );

    return NextResponse.json(
      {
        message: 'Asset deleted successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Admin access required') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Delete asset error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete asset' },
      { status: 500 }
    );
  }
}
