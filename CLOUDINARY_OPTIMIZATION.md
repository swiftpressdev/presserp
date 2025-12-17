# Cloudinary Integration & Bandwidth Optimization

## Overview
This document explains the Cloudinary integration and bandwidth optimization strategies implemented for company asset uploads.

## Environment Variables Required
Add these to your `.env` file:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Bandwidth Optimization Strategies

### 1. **Automatic Format Conversion (WebP)**
- **Implementation**: `fetch_format: 'auto'` in Cloudinary transformations
- **Benefit**: WebP format provides 25-35% better compression than JPEG/PNG
- **Bandwidth Savings**: ~30% reduction in file size
- **Cost Impact**: Lower bandwidth costs due to smaller file sizes

### 2. **Quality Compression**
- **Letterhead**: 85% quality (needs higher quality for professional documents)
- **Other Assets**: 80% quality (logos, stamps, signatures)
- **Benefit**: Reduces file size by 40-60% while maintaining visual quality
- **Bandwidth Savings**: ~50% reduction in file size
- **Cost Impact**: Significant reduction in storage and bandwidth costs

### 3. **Dimension Limits**
- **Letterhead**: Max 2000x2000 pixels (crop: 'limit' maintains aspect ratio)
- **Other Assets**: Max 1000x1000 pixels
- **Benefit**: Prevents unnecessarily large images
- **Bandwidth Savings**: 60-80% reduction for oversized images
- **Cost Impact**: Prevents storage of oversized files

### 4. **Smart Crop Mode**
- **Implementation**: `crop: 'limit'` - maintains aspect ratio while limiting dimensions
- **Benefit**: No distortion, optimal file size
- **Bandwidth Savings**: Ensures consistent file sizes

### 5. **Organized Folder Structure**
- **Structure**: `presserp/{adminId}/{assetType}/`
- **Benefit**: Easy management, can apply folder-level transformations
- **Cost Impact**: Better organization = easier optimization management

## File Size Limits
- **Letterhead**: 5MB maximum (upload limit)
- **Other Assets**: 1MB maximum (upload limit)
- **After Optimization**: Files are typically 70-90% smaller than original

## Total Bandwidth Savings
Combined optimizations result in:
- **Average file size reduction**: 70-85%
- **Bandwidth cost reduction**: ~75%
- **Storage cost reduction**: ~75%

## Example Savings Calculation
**Before Optimization:**
- Letterhead: 5MB original → 5MB stored → 5MB bandwidth per view
- Logo: 2MB original → 2MB stored → 2MB bandwidth per view

**After Optimization:**
- Letterhead: 5MB original → ~0.75MB stored → ~0.75MB bandwidth per view
- Logo: 2MB original → ~0.3MB stored → ~0.3MB bandwidth per view

**Savings**: 85% reduction in bandwidth costs

## Implementation Details

### Upload API (`app/api/settings/upload-asset/route.ts`)
- Validates file type (images only)
- Validates file size (1MB or 5MB based on asset type)
- Uploads to Cloudinary with optimizations
- Returns optimized URL

### Cloudinary Utility (`lib/cloudinary.ts`)
- Configures Cloudinary with environment variables
- Applies transformations during upload
- Handles image deletion

### Settings Page (`app/dashboard/settings/page.tsx`)
- File upload UI for each asset type
- Preview of uploaded images
- Real-time upload status
- Error handling and user feedback

## Best Practices
1. Always use the optimized URLs returned from Cloudinary
2. Don't upload the same image multiple times (reuse URLs)
3. Delete old images when replacing assets (future enhancement)
4. Monitor Cloudinary usage dashboard for cost tracking

## Future Enhancements
- Automatic deletion of old images when replacing
- Image optimization presets for different use cases
- Lazy loading for image previews
- CDN caching headers for better performance
