import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadOptions {
  folder?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'jpg' | 'png';
  publicId?: string; // Use same public_id to override existing image
}

/**
 * Upload image to Cloudinary with optimization
 * Optimizations applied:
 * - Automatic format conversion (WebP when supported)
 * - Quality compression (80% for good balance)
 * - Max width/height limits to reduce file size
 * - Fetch format auto for bandwidth savings
 */
export async function uploadImage(
  fileBuffer: Buffer,
  options: UploadOptions = {}
): Promise<{ secure_url: string; public_id: string }> {
  const {
    folder = 'presserp',
    maxWidth = 2000,
    maxHeight = 2000,
    quality = 80,
    format = 'auto',
    publicId,
  } = options;

  return new Promise((resolve, reject) => {
    const uploadOptions: any = {
      folder,
      transformation: [
        {
          width: maxWidth,
          height: maxHeight,
          crop: 'limit', // Maintain aspect ratio, limit dimensions
          quality,
          fetch_format: format, // Auto-convert to WebP when supported
        },
      ],
      resource_type: 'image',
      overwrite: publicId ? true : false, // Override if public_id provided
      invalidate: true, // Invalidate CDN cache for new upload
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
          });
        } else {
          reject(new Error('Upload failed: No result returned'));
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Delete image from Cloudinary
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    // Don't throw - deletion failure shouldn't break the flow
  }
}

export default cloudinary;
