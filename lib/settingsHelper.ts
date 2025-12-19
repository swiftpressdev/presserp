// Helper to get settings with optimized Cloudinary URLs for PDF generation
export interface PDFAssets {
  companyLogo?: string;
  companyStamp?: string;
  letterhead?: string;
  esignature?: string;
  companyName?: string;
  address?: string;
  email?: string;
  phone?: string;
  regdNo?: string;
}

export interface SettingsData {
  companyName?: string;
  address?: string;
  email?: string;
  phone?: string;
  regdNo?: string;
  companyLogo?: string;
  companyStamp?: string;
  letterhead?: string;
  esignature?: string;
  companyLogoUseIn?: string[];
  companyStampUseIn?: string[];
  letterheadUseIn?: string[];
  esignatureUseIn?: string[];
}

export async function getSettingsForPDF(documentType: 'Quotation' | 'Job' | 'Estimate' | 'Challan'): Promise<PDFAssets> {
  try {
    const response = await fetch('/api/settings');
    const data = await response.json();
    
    if (!response.ok || !data.settings) {
      return {};
    }
    
    return filterAssetsForDocument(data.settings, documentType);
  } catch (error) {
    console.error('Failed to fetch settings for PDF:', error);
    return {};
  }
}

// Helper to filter assets based on document type
export function filterAssetsForDocument(settings: SettingsData, documentType: 'Quotation' | 'Job' | 'Estimate' | 'Challan'): PDFAssets {
  const assets: PDFAssets = {
    companyName: settings.companyName,
    address: settings.address,
    email: settings.email,
    phone: settings.phone,
    regdNo: settings.regdNo,
  };
  
  // Check if each asset should be used in this document type
  if (settings.companyLogoUseIn?.includes(documentType) && settings.companyLogo) {
    assets.companyLogo = settings.companyLogo;
  }
  
  if (settings.companyStampUseIn?.includes(documentType) && settings.companyStamp) {
    assets.companyStamp = settings.companyStamp;
  }
  
  if (settings.letterheadUseIn?.includes(documentType) && settings.letterhead) {
    assets.letterhead = settings.letterhead;
  }
  
  if (settings.esignatureUseIn?.includes(documentType) && settings.esignature) {
    assets.esignature = settings.esignature;
  }
  
  return assets;
}

// Helper to load image from URL for jsPDF
export async function loadImageForPDF(url: string): Promise<string> {
  try {
    // For Cloudinary URLs, we can use them directly or fetch and convert
    // Fetching ensures CORS compatibility
    const response = await fetch(url, {
      mode: 'cors',
      cache: 'default',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (!result) {
          reject(new Error('Failed to read image data'));
        } else {
          resolve(result);
        }
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to load image from URL:', url, error);
    throw error;
  }
}
