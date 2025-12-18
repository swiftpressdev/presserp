import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getSettingsForPDF, loadImageForPDF, PDFAssets } from './settingsHelper';

interface Particular {
  sn: number;
  particulars: string;
  quantity: number;
  rate: number;
  amount: number;
}

// Helper to add letterhead background
async function addLetterheadBackground(doc: jsPDF, letterheadUrl: string) {
  try {
    const imageData = await loadImageForPDF(letterheadUrl);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    // Use PNG format for better quality, auto-detect format
    const format = letterheadUrl.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
    doc.addImage(imageData, format, 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  } catch (error) {
    console.error('Failed to add letterhead:', error);
  }
}

// Helper to add company assets (logo, stamp, signature)
async function addCompanyAssets(
  doc: jsPDF,
  assets: PDFAssets,
  finalY: number,
  includeStamp: boolean = true,
  includeSignature: boolean = true
) {
  let xPos = 14;
  
  // Add company logo at top right if available
  if (assets.companyLogo) {
    try {
      const logoData = await loadImageForPDF(assets.companyLogo);
      doc.addImage(logoData, 'PNG', 160, 10, 40, 20, undefined, 'FAST');
    } catch (error) {
      console.error('Failed to add logo:', error);
    }
  }
  
  // Add prepared by section at bottom
  let preparedByY = finalY + 30;
  doc.setFontSize(9);
  doc.text('Prepared By:', xPos, preparedByY);
  
  // Add signature if available
  if (includeSignature && assets.esignature) {
    try {
      const signatureData = await loadImageForPDF(assets.esignature);
      doc.addImage(signatureData, 'PNG', xPos, preparedByY + 5, 30, 15, undefined, 'FAST');
    } catch (error) {
      console.error('Failed to add signature:', error);
    }
  }
  
  // Add stamp if available
  if (includeStamp && assets.companyStamp) {
    try {
      const stampData = await loadImageForPDF(assets.companyStamp);
      doc.addImage(stampData, 'PNG', xPos + 50, preparedByY + 5, 30, 30, undefined, 'FAST');
    } catch (error) {
      console.error('Failed to add stamp:', error);
    }
  }
}

interface QuotationData {
  quotationSN: string;
  partyName: string;
  address: string;
  phoneNumber: string;
  particulars: Particular[];
  total: number;
  hasVAT: boolean;
  subtotal?: number;
  vatAmount?: number;
  grandTotal: number;
}

export async function generateQuotationPDF(data: QuotationData) {
  const assets = await getSettingsForPDF('Quotation');
  const doc = new jsPDF();

  // Vertical offset when letterhead is present (to avoid overlapping with letterhead content)
  const letterheadOffset = assets.letterhead ? 40 : 0;

  // Add letterhead background if configured
  if (assets.letterhead) {
    await addLetterheadBackground(doc, assets.letterhead);
  }

  doc.setFontSize(20);
  doc.text('QUOTATION', 105, 20 + letterheadOffset, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`Quotation No: ${data.quotationSN}`, 14, 35 + letterheadOffset);
  doc.text(`Party Name: ${data.partyName}`, 14, 42 + letterheadOffset);
  doc.text(`Address: ${data.address}`, 14, 49 + letterheadOffset);
  doc.text(`Phone: ${data.phoneNumber}`, 14, 56 + letterheadOffset);

  const tableData = data.particulars.map((item) => [
    item.sn,
    item.particulars,
    item.quantity,
    item.rate.toFixed(2),
    item.amount.toFixed(2),
  ]);

  autoTable(doc, {
    startY: 65 + letterheadOffset,
    head: [['SN', 'Particulars', 'Quantity', 'Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.text(`Total: ${data.total.toFixed(2)}`, 14, finalY);

  if (data.hasVAT) {
    doc.text(`Subtotal: ${data.subtotal?.toFixed(2)}`, 14, finalY + 7);
    doc.text(`VAT (13%): ${data.vatAmount?.toFixed(2)}`, 14, finalY + 14);
    doc.text(`Grand Total: ${data.grandTotal.toFixed(2)}`, 14, finalY + 21);
  } else {
    doc.text(`Grand Total: ${data.grandTotal.toFixed(2)}`, 14, finalY + 7);
  }

  // Add company assets (logo, stamp, signature)
  await addCompanyAssets(doc, assets, finalY + (data.hasVAT ? 21 : 7));

  doc.save(`Quotation-${data.quotationSN}.pdf`);
}

interface EstimateData {
  estimateNumber: string;
  estimateDate: string;
  clientName: string;
  jobNumber: string;
  totalBWPages: number;
  totalColorPages: number;
  totalPages: number;
  paperSize: string;
  particulars: Particular[];
  total: number;
  hasVAT: boolean;
  subtotal?: number;
  vatAmount?: number;
  grandTotal: number;
}

export async function generateEstimatePDF(data: EstimateData) {
  const assets = await getSettingsForPDF('Estimate');
  const doc = new jsPDF();

  // Vertical offset when letterhead is present (to avoid overlapping with letterhead content)
  const letterheadOffset = assets.letterhead ? 40 : 0;

  // Add letterhead background if configured
  if (assets.letterhead) {
    await addLetterheadBackground(doc, assets.letterhead);
  }

  doc.setFontSize(20);
  doc.text('ESTIMATE', 105, 20 + letterheadOffset, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`Estimate No: ${data.estimateNumber}`, 14, 35 + letterheadOffset);
  doc.text(`Date: ${data.estimateDate}`, 14, 42 + letterheadOffset);
  doc.text(`Client: ${data.clientName}`, 14, 49 + letterheadOffset);
  doc.text(`Job No: ${data.jobNumber}`, 14, 56 + letterheadOffset);
  doc.text(`Paper Size: ${data.paperSize}`, 14, 63 + letterheadOffset);
  doc.text(
    `Pages: ${data.totalPages} (BW: ${data.totalBWPages}, Color: ${data.totalColorPages})`,
    14,
    70 + letterheadOffset
  );

  const tableData = data.particulars.map((item) => [
    item.sn,
    item.particulars,
    item.quantity,
    item.rate.toFixed(2),
    item.amount.toFixed(2),
  ]);

  autoTable(doc, {
    startY: 78 + letterheadOffset,
    head: [['SN', 'Particulars', 'Quantity', 'Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.text(`Total: ${data.total.toFixed(2)}`, 14, finalY);

  if (data.hasVAT) {
    doc.text(`Subtotal: ${data.subtotal?.toFixed(2)}`, 14, finalY + 7);
    doc.text(`VAT (13%): ${data.vatAmount?.toFixed(2)}`, 14, finalY + 14);
    doc.text(`Grand Total: ${data.grandTotal.toFixed(2)}`, 14, finalY + 21);
  } else {
    doc.text(`Grand Total: ${data.grandTotal.toFixed(2)}`, 14, finalY + 7);
  }

  // Add company assets (logo, stamp, signature)
  await addCompanyAssets(doc, assets, finalY + (data.hasVAT ? 21 : 7));

  doc.save(`Estimate-${data.estimateNumber}.pdf`);
}

interface JobData {
  jobNo: string;
  jobName: string;
  clientName: string;
  jobDate: string;
  deliveryDate: string;
  jobTypes: string[];
  quantity: number;
  paperName: string;
  paperSize: string;
  totalBWPages: number;
  totalColorPages: number;
  totalPages: number;
  pageColor?: string;
  pageColorOther?: string;
  bookSize?: string;
  bookSizeOther?: string;
  totalPlate?: string;
  totalPlateOther?: string;
  totalFarma?: string;
  totalFarmaOther?: string;
  plateBy: string;
  plateFrom?: string;
  plateSize?: string;
  plateSizeOther?: string;
  machineName: string;
  laminationThermal?: string;
  normal?: string;
  folding: boolean;
  binding?: string;
  stitch?: string;
  additional?: string[];
  relatedToJobNo?: string;
  remarks?: string;
  specialInstructions?: string;
}

export async function generateJobPDF(data: JobData) {
  const assets = await getSettingsForPDF('Job');
  const doc = new jsPDF();

  // Vertical offset when letterhead is present (to avoid overlapping with letterhead content)
  const letterheadOffset = assets.letterhead ? 40 : 0;

  // Add letterhead background if configured
  if (assets.letterhead) {
    await addLetterheadBackground(doc, assets.letterhead);
  }

  doc.setFontSize(20);
  doc.text('JOB DETAILS', 105, 20 + letterheadOffset, { align: 'center' });

  let yPos = 35 + letterheadOffset;
  doc.setFontSize(10);

  doc.text(`Job No: ${data.jobNo}`, 14, yPos);
  yPos += 7;
  doc.text(`Job Name: ${data.jobName}`, 14, yPos);
  yPos += 7;
  doc.text(`Client: ${data.clientName}`, 14, yPos);
  yPos += 7;
  doc.text(`Job Date: ${data.jobDate}`, 14, yPos);
  yPos += 7;
  doc.text(`Delivery Date: ${data.deliveryDate}`, 14, yPos);
  yPos += 7;
  doc.text(`Job Type: ${data.jobTypes.join(', ')}`, 14, yPos);
  yPos += 7;
  doc.text(`Quantity: ${data.quantity}`, 14, yPos);
  yPos += 7;
  doc.text(`Paper Type: ${data.paperName}`, 14, yPos);
  yPos += 7;
  doc.text(`Paper Size: ${data.paperSize}`, 14, yPos);
  yPos += 7;
  doc.text(`Total Pages: ${data.totalPages} (BW: ${data.totalBWPages}, Color: ${data.totalColorPages})`, 14, yPos);
  yPos += 7;
  
  if (data.pageColor) {
    const pageColorValue = data.pageColor === 'Other' && data.pageColorOther ? data.pageColorOther : data.pageColor;
    doc.text(`Page Color: ${pageColorValue}`, 14, yPos);
    yPos += 7;
  }
  
  if (data.bookSize) {
    const bookSizeValue = data.bookSize === 'Other' && data.bookSizeOther ? data.bookSizeOther : data.bookSize;
    doc.text(`Book Size: ${bookSizeValue}`, 14, yPos);
    yPos += 7;
  }
  
  if (data.totalPlate) {
    const totalPlateValue = data.totalPlate === 'Other' && data.totalPlateOther ? data.totalPlateOther : data.totalPlate;
    doc.text(`Total Plate: ${totalPlateValue}`, 14, yPos);
    yPos += 7;
  }
  
  if (data.totalFarma) {
    const totalFarmaValue = data.totalFarma === 'Other' && data.totalFarmaOther ? data.totalFarmaOther : data.totalFarma;
    doc.text(`Total Farma: ${totalFarmaValue}`, 14, yPos);
    yPos += 7;
  }
  
  doc.text(`Plate By: ${data.plateBy}`, 14, yPos);
  yPos += 7;
  
  if (data.plateFrom) {
    doc.text(`Plate From: ${data.plateFrom}`, 14, yPos);
    yPos += 7;
  }
  
  if (data.plateSize) {
    const plateSizeValue = data.plateSize === 'Other' && data.plateSizeOther ? data.plateSizeOther : data.plateSize;
    doc.text(`Plate Size: ${plateSizeValue}`, 14, yPos);
    yPos += 7;
  }
  
  doc.text(`Machine: ${data.machineName}`, 14, yPos);
  yPos += 7;
  
  if (data.laminationThermal) {
    doc.text(`Lamination Thermal: ${data.laminationThermal}`, 14, yPos);
    yPos += 7;
  }
  
  if (data.normal) {
    doc.text(`Normal: ${data.normal}`, 14, yPos);
    yPos += 7;
  }
  
  doc.text(`Folding: ${data.folding ? 'Yes' : 'No'}`, 14, yPos);
  yPos += 7;
  
  if (data.binding) {
    doc.text(`Binding: ${data.binding}`, 14, yPos);
    yPos += 7;
  }
  
  if (data.stitch) {
    doc.text(`Stitch: ${data.stitch}`, 14, yPos);
    yPos += 7;
  }
  
  if (data.additional && data.additional.length > 0) {
    doc.text(`Additional Services: ${data.additional.join(', ')}`, 14, yPos);
    yPos += 7;
  }
  
  if (data.relatedToJobNo) {
    doc.text(`Related To Job: ${data.relatedToJobNo}`, 14, yPos);
    yPos += 7;
  }
  
  if (data.remarks) {
    doc.text(`Remarks: ${data.remarks}`, 14, yPos);
    yPos += 7;
  }
  
  if (data.specialInstructions) {
    doc.text(`Special Instructions: ${data.specialInstructions}`, 14, yPos);
    yPos += 7;
  }

  // Add company assets (logo, stamp, signature)
  await addCompanyAssets(doc, assets, yPos);

  doc.save(`Job-${data.jobNo}.pdf`);
}

interface ChallanParticular {
  sn: number;
  particulars: string;
  quantity: number;
}

interface ChallanData {
  challanNumber: string;
  challanDate: string;
  destination: string;
  estimateReferenceNo: string;
  particulars: ChallanParticular[];
  totalUnits: number;
}

export async function generateChallanPDF(data: ChallanData) {
  const assets = await getSettingsForPDF('Challan');
  const doc = new jsPDF();

  // Vertical offset when letterhead is present (to avoid overlapping with letterhead content)
  const letterheadOffset = assets.letterhead ? 40 : 0;

  // Add letterhead background if configured
  if (assets.letterhead) {
    await addLetterheadBackground(doc, assets.letterhead);
  }

  doc.setFontSize(20);
  doc.text('CHALLAN', 105, 20 + letterheadOffset, { align: 'center' });

  let yPos = 35 + letterheadOffset;
  doc.setFontSize(10);

  doc.text(`Challan No: ${data.challanNumber}`, 14, yPos);
  yPos += 7;
  doc.text(`Date: ${data.challanDate}`, 14, yPos);
  yPos += 7;
  doc.text(`Destination: ${data.destination}`, 14, yPos);
  yPos += 7;
  doc.text(`Estimate Reference No: ${data.estimateReferenceNo}`, 14, yPos);
  yPos += 10;

  const tableData = data.particulars.map((p) => [
    p.sn.toString(),
    p.particulars,
    p.quantity.toFixed(2),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['SN', 'Particulars', 'Quantity']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [66, 139, 202] },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 40, halign: 'right' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || yPos + 20;
  doc.setFontSize(10);
  doc.text(`Total Units: ${data.totalUnits.toFixed(2)}`, 14, finalY + 10);

  // Add company assets (logo, stamp, signature)
  await addCompanyAssets(doc, assets, finalY + 10);

  doc.save(`Challan-${data.challanNumber}.pdf`);
}
