import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getSettingsForPDF, loadImageForPDF, PDFAssets } from './settingsHelper';
import { getCurrentBSDate, formatBSDate } from './dateUtils';

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
  includeSignature: boolean = true,
  signatureAlign: 'left' | 'right' = 'left'
) {
  let xPos = 20;
  
  // Logo is already added in header for Job PDF, so skip here
  // Add signature if available
  let signatureY = finalY - 1; // Decreased space above e-signature
  if (includeSignature && assets.esignature) {
    try {
      const signatureData = await loadImageForPDF(assets.esignature);
      const signatureWidth = 30;
      const signatureX = signatureAlign === 'right' ? 190 - signatureWidth : xPos;
      doc.addImage(signatureData, 'PNG', signatureX, signatureY, signatureWidth, 15, undefined, 'FAST');
      // Add horizontal bar above "Authorized Signature" text
      const textY = signatureY + 18;
      const textWidth = doc.getTextWidth('Authorized Signature');
      doc.setLineWidth(0.2);
      if (signatureAlign === 'right') {
        doc.line(190 - textWidth, textY - 4, 190, textY - 4);
        // Add "Authorized Signature" text below the signature (right-aligned)
        doc.setFontSize(9);
        doc.text('Authorized Signature', 190, textY, { align: 'right' });
      } else {
        doc.line(xPos, textY - 4, xPos + textWidth, textY - 4);
        // Add "Authorized Signature" text below the signature
        doc.setFontSize(9);
        doc.text('Authorized Signature', xPos, textY);
      }
    } catch (error) {
      console.error('Failed to add signature:', error);
    }
  }
  
  // Add stamp if available
  if (includeStamp && assets.companyStamp) {
    try {
      const stampData = await loadImageForPDF(assets.companyStamp);
      doc.addImage(stampData, 'PNG', xPos + 50, signatureY, 30, 30, undefined, 'FAST');
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
  hasDiscount?: boolean;
  discountPercentage?: number;
  discountAmount?: number;
  priceAfterDiscount?: number;
  vatType: 'excluded' | 'included' | 'none';
  vatAmount?: number;
  grandTotal: number;
  amountInWords?: string;
  remarks?: string;
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
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION', 105, 20 + letterheadOffset, { align: 'center' });
  doc.setFont('helvetica', 'normal');

  // Add current date (right-aligned)
  const currentDate = formatBSDate(getCurrentBSDate());
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Date: ${currentDate}`, 190, 35 + letterheadOffset, { align: 'right' });
  doc.setFont('helvetica', 'normal');

  // Quotation No with bold label (right-aligned)
  doc.setFont('helvetica', 'bold');
  doc.text(`Quotation No: ${data.quotationSN}`, 190, 42 + letterheadOffset, { align: 'right' });
  doc.setFont('helvetica', 'normal');

  // Party Name with bold label
  doc.setFont('helvetica', 'bold');
  doc.text('Party Name: ', 20, 49 + letterheadOffset);
  doc.setFont('helvetica', 'normal');
  const partyNameX = 20 + doc.getTextWidth('Party Name: ') + 2;
  doc.text(data.partyName, partyNameX, 49 + letterheadOffset);

  // Address with bold label
  doc.setFont('helvetica', 'bold');
  doc.text('Address: ', 20, 56 + letterheadOffset);
  doc.setFont('helvetica', 'normal');
  const addressX = 20 + doc.getTextWidth('Address: ') + 2;
  doc.text(data.address, addressX, 56 + letterheadOffset);

  // Phone with bold label
  doc.setFont('helvetica', 'bold');
  doc.text('Phone: ', 20, 63 + letterheadOffset);
  doc.setFont('helvetica', 'normal');
  const phoneX = 20 + doc.getTextWidth('Phone: ') + 2;
  doc.text(data.phoneNumber, phoneX, 63 + letterheadOffset);

  const tableData = data.particulars.map((item) => [
    item.sn,
    item.particulars,
    item.quantity,
    item.rate.toFixed(2),
    item.amount.toFixed(2),
  ]);

  autoTable(doc, {
    startY: 70 + letterheadOffset,
    head: [['SN', 'Particulars', 'Quantity', 'Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    margin: { left: 20, right: 20 },
    headStyles: { fillColor: false, textColor: [0, 0, 0], lineWidth: 0.2 },
    bodyStyles: { fillColor: false, textColor: [0, 0, 0], lineWidth: 0.2 },
    styles: { lineWidth: 0.2, lineColor: [0, 0, 0] },
    tableLineWidth: 0.2,
    tableLineColor: [0, 0, 0],
  });

  let currentY = (doc as any).lastAutoTable.finalY + 10;

  // Show discount breakdown if applied (before subtotal)
  if (data.hasDiscount && data.discountPercentage && data.discountPercentage > 0) {
    const discountBase = data.vatType === 'included' ? Number((data.total / 1.13).toFixed(2)) : data.total;
    doc.text(`Discount (${data.discountPercentage}% on ${discountBase.toFixed(2)}): -${data.discountAmount?.toFixed(2)}`, 20, currentY);
    currentY += 7;
  }

  // Show breakdown based on VAT type (right-aligned)
  if (data.vatType === 'excluded') {
    // VAT Excluded: Sub Total, VAT Amount, Grand Total
    const subtotal = data.priceAfterDiscount || data.total;
    doc.text(`Sub Total: ${subtotal.toFixed(2)}`, 190, currentY, { align: 'right' });
    currentY += 7;
    
    if (data.vatAmount) {
      doc.text(`VAT Amount (13%): ${data.vatAmount.toFixed(2)}`, 190, currentY, { align: 'right' });
      currentY += 7;
    }
  } else if (data.vatType === 'included') {
    // VAT Included: Sub Total, Base Price (VAT extracted), Extracted VAT Amount, Grand Total
    doc.text(`Sub Total: ${data.total.toFixed(2)}`, 190, currentY, { align: 'right' });
    currentY += 7;
    
    const basePrice = Number((data.total / 1.13).toFixed(2));
    const extractedVAT = Number((data.total - basePrice).toFixed(2));
    doc.text(`Base Price (VAT extracted): ${basePrice.toFixed(2)}`, 190, currentY, { align: 'right' });
    currentY += 7;
    doc.text(`Extracted VAT Amount (13%): ${extractedVAT.toFixed(2)}`, 190, currentY, { align: 'right' });
    currentY += 7;
  } else {
    // No VAT: Just show total
    doc.text(`Sub Total: ${data.total.toFixed(2)}`, 190, currentY, { align: 'right' });
    currentY += 7;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Grand Total: ${data.grandTotal.toFixed(2)}`, 190, currentY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  currentY += 7;

  // Add amount in words if present (right-aligned)
  if (data.amountInWords) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const amountInWordsText = `Amount in Words: ${data.amountInWords}`;
    const amountInWordsLines = doc.splitTextToSize(amountInWordsText, 150);
    doc.text(amountInWordsLines, 190, currentY, { align: 'right' });
    currentY += amountInWordsLines.length * 5;
    doc.setFont('helvetica', 'normal');
  }

  // Add remarks if present
  if (data.remarks && data.remarks.trim()) {
    currentY += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Remarks:', 20, currentY);
    currentY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const remarksLines = doc.splitTextToSize(data.remarks, 180);
    doc.text(remarksLines, 20, currentY);
    currentY += remarksLines.length * 5;
  }

  // Add company assets (logo, stamp, signature) - signature right-aligned for quotation
  await addCompanyAssets(doc, assets, currentY, true, true, 'right');

  doc.save(`Quotation-${data.quotationSN}.pdf`);
}

interface DeliveryNote {
  date: string;
  challanNo: string;
  quantity: number;
  remarks?: string;
}

interface EstimateData {
  estimateNumber: string;
  estimateDate: string;
  clientName: string;
  jobNumber: string | string[];
  totalBWPages: number;
  totalColorPages: number;
  totalPages: number;
  paperSize: string;
  finishSize?: string;
  particulars: Particular[];
  total: number;
  hasDiscount?: boolean;
  discountPercentage?: number;
  discountAmount?: number;
  priceAfterDiscount?: number;
  vatType: 'excluded' | 'included' | 'none';
  vatAmount?: number;
  grandTotal: number;
  amountInWords?: string;
  remarks?: string;
  deliveryNotes?: DeliveryNote[];
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
  doc.setFont('helvetica', 'bold');
  doc.text('ESTIMATE', 105, 20 + letterheadOffset, { align: 'center' });
  doc.setFont('helvetica', 'normal');

  doc.setFontSize(10);
  // Estimate No with bold label
  doc.setFont('helvetica', 'bold');
  doc.text('Estimate No: ', 20, 35 + letterheadOffset);
  doc.setFont('helvetica', 'normal');
  const estimateNoX = 20 + doc.getTextWidth('Estimate No: ') + 2;
  doc.text(data.estimateNumber, estimateNoX, 35 + letterheadOffset);

  // Date with bold label
  doc.setFont('helvetica', 'bold');
  doc.text('Date: ', 20, 42 + letterheadOffset);
  doc.setFont('helvetica', 'normal');
  const dateX = 20 + doc.getTextWidth('Date: ') + 2;
  doc.text(data.estimateDate, dateX, 42 + letterheadOffset);

  doc.text(`Client: ${data.clientName}`, 20, 49 + letterheadOffset);
  const jobNumbers = Array.isArray(data.jobNumber) ? data.jobNumber.join(', ') : data.jobNumber;
  doc.text(`Job ${Array.isArray(data.jobNumber) && data.jobNumber.length > 1 ? 'Nos' : 'No'}: ${jobNumbers}`, 20, 56 + letterheadOffset);
  doc.text(`Paper Size: ${data.paperSize}`, 20, 63 + letterheadOffset);
  doc.text(
    `Pages: ${data.totalPages} (BW: ${data.totalBWPages}, Color: ${data.totalColorPages})`,
    20,
    70 + letterheadOffset
  );
  
  let nextY = 77 + letterheadOffset;
  if (data.finishSize) {
    doc.text(`Finish Size: ${data.finishSize}`, 20, nextY);
    nextY += 7;
  }

  const tableData = data.particulars.map((item) => [
    item.sn,
    item.particulars,
    item.quantity,
    item.rate.toFixed(2),
    item.amount.toFixed(2),
  ]);

  autoTable(doc, {
    startY: nextY,
    head: [['SN', 'Particulars', 'Quantity', 'Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    margin: { left: 20, right: 20 },
    headStyles: { fillColor: false, textColor: [0, 0, 0], lineWidth: 0.2 },
    bodyStyles: { fillColor: false, textColor: [0, 0, 0], lineWidth: 0.2 },
    styles: { lineWidth: 0.2, lineColor: [0, 0, 0] },
    tableLineWidth: 0.2,
    tableLineColor: [0, 0, 0],
  });

  let currentY = (doc as any).lastAutoTable.finalY + 10;

  // Show discount breakdown if applied (before subtotal)
  if (data.hasDiscount && data.discountPercentage && data.discountPercentage > 0) {
    const discountBase = data.vatType === 'included' ? Number((data.total / 1.13).toFixed(2)) : data.total;
    doc.text(`Discount (${data.discountPercentage}% on ${discountBase.toFixed(2)}): -${data.discountAmount?.toFixed(2)}`, 20, currentY);
    currentY += 7;
  }

  // Show breakdown based on VAT type
  if (data.vatType === 'excluded') {
    // VAT Excluded: Sub Total, VAT Amount, Grand Total
    const subtotal = data.priceAfterDiscount || data.total;
    doc.text(`Sub Total: ${subtotal.toFixed(2)}`, 20, currentY);
    currentY += 7;
    
    if (data.vatAmount) {
      doc.text(`VAT Amount (13%): ${data.vatAmount.toFixed(2)}`, 20, currentY);
      currentY += 7;
    }
  } else if (data.vatType === 'included') {
    // VAT Included: Sub Total, Base Price (VAT extracted), Extracted VAT Amount, Grand Total
    doc.text(`Sub Total: ${data.total.toFixed(2)}`, 20, currentY);
    currentY += 7;
    
    const basePrice = Number((data.total / 1.13).toFixed(2));
    const extractedVAT = Number((data.total - basePrice).toFixed(2));
    doc.text(`Base Price (VAT extracted): ${basePrice.toFixed(2)}`, 20, currentY);
    currentY += 7;
    doc.text(`Extracted VAT Amount (13%): ${extractedVAT.toFixed(2)}`, 20, currentY);
    currentY += 7;
  } else {
    // No VAT: Just show total
    doc.text(`Sub Total: ${data.total.toFixed(2)}`, 20, currentY);
    currentY += 7;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Grand Total: ${data.grandTotal.toFixed(2)}`, 20, currentY);
  doc.setFont('helvetica', 'normal');
  currentY += 7;

  // Add amount in words if present
  if (data.amountInWords) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Amount in Words: ', 20, currentY);
    doc.setFont('helvetica', 'normal');
    const amountInWordsX = 20 + doc.getTextWidth('Amount in Words: ') + 2;
    const amountInWordsLines = doc.splitTextToSize(data.amountInWords, 150);
    doc.text(amountInWordsLines, amountInWordsX, currentY);
    currentY += amountInWordsLines.length * 5;
  }

  // Add remarks if present
  if (data.remarks && data.remarks.trim()) {
    currentY += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Remarks:', 20, currentY);
    currentY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const remarksLines = doc.splitTextToSize(data.remarks, 180);
    doc.text(remarksLines, 20, currentY);
    currentY += remarksLines.length * 5;
  }

  // Add Delivery Notes if present
  if (data.deliveryNotes && data.deliveryNotes.length > 0) {
    currentY += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Delivery Notes', 20, currentY);
    currentY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const deliveryNotesTableData = data.deliveryNotes.map((note) => [
      formatBSDate(note.date),
      note.challanNo,
      note.quantity.toFixed(2),
      note.remarks || '-',
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Date (BS)', 'Challan No', 'Quantity', 'Remarks']],
      body: deliveryNotesTableData,
      theme: 'grid',
      margin: { left: 20, right: 20 },
      headStyles: { fillColor: false, textColor: [0, 0, 0], lineWidth: 0.2 },
      bodyStyles: { fillColor: false, textColor: [0, 0, 0], lineWidth: 0.2 },
      styles: { lineWidth: 0.2, lineColor: [0, 0, 0], fontSize: 9 },
      tableLineWidth: 0.2,
      tableLineColor: [0, 0, 0],
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;

    // Add total quantity
    const totalQuantity = data.deliveryNotes.reduce((sum, note) => sum + note.quantity, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Quantity: ${totalQuantity.toFixed(2)}`, 20, currentY);
    doc.setFont('helvetica', 'normal');
    currentY += 7;
  }

  // Add company assets (logo, stamp, signature)
  await addCompanyAssets(doc, assets, currentY);

  doc.save(`Estimate-${data.estimateNumber}.pdf`);
}

interface JobData {
  jobNo: string;
  jobName: string;
  clientName: string;
  clientAddress?: string;
  jobDate: string;
  deliveryDate: string;
  jobTypes: string[];
  quantity: number;
  paperBy?: 'customer' | 'company';
  paperFrom?: string;
  paperFromCustom?: string;
  paperName?: string;
  paperType?: string;
  paperSize: string;
  paperWeight?: string;
  paperDetails?: Array<{
    paperId: string;
    type: string;
    size: string;
    weight: string;
    paperFrom: string;
    unit: string;
    issuedQuantity: number;
    wastage: number;
  }>;
  totalBWPages: number;
  totalColorPages: number;
  totalPages: number;
  pageColor?: string;
  pageColorOther?: string;
  bookSize?: string;
  bookSizeOther?: string;
  totalPlate?: string;
  totalFarma?: string;
  plateBy: string;
  plateFrom?: string;
  plateSize?: string;
  plateSizeOther?: string;
  machineName: string;
  laminationThermal?: string;
  normal?: string;
  folding: boolean;
  binding?: string;
  bindingOther?: string;
  stitch?: string;
  stitchOther?: string;
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

  // Professional Header Layout
  const headerY = 5 + letterheadOffset;
  
  // 1. Company Logo on Top Left (maintain aspect ratio)
  if (assets.companyLogo) {
    try {
      const logoData = await loadImageForPDF(assets.companyLogo);
      // Detect image format
      let format = 'PNG';
      if (logoData.startsWith('data:image/')) {
        const match = logoData.match(/data:image\/(\w+);/);
        if (match && match[1]) {
          format = match[1].toUpperCase();
          if (format === 'JPEG') format = 'JPEG';
          else if (format !== 'PNG') format = 'PNG';
        }
      } else {
        const logoUrl = assets.companyLogo.toLowerCase();
        if (logoUrl.includes('.png')) format = 'PNG';
        else if (logoUrl.includes('.jpg') || logoUrl.includes('.jpeg')) format = 'JPEG';
      }
      
      // Create temporary image to get dimensions
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = logoData;
      });
      
      // Calculate dimensions maintaining aspect ratio (smaller size for compact header)
      const maxWidth = 30;
      const maxHeight = 15;
      let logoWidth = img.width;
      let logoHeight = img.height;
      const aspectRatio = logoWidth / logoHeight;
      
      if (logoWidth > maxWidth) {
        logoWidth = maxWidth;
        logoHeight = logoWidth / aspectRatio;
      }
      if (logoHeight > maxHeight) {
        logoHeight = maxHeight;
        logoWidth = logoHeight * aspectRatio;
      }
      
      doc.addImage(logoData, format, 20, headerY, logoWidth, logoHeight, undefined, 'FAST');
    } catch (error) {
      // Silently fail if logo cannot be loaded
    }
  }

  // 2. Company Name, Address, Phone on Top Middle (centered, compact)
  const centerX = 105;
  let companyInfoY = headerY + 2;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  if (assets.companyName) {
    doc.text(assets.companyName, centerX, companyInfoY, { align: 'center' });
    companyInfoY += 4;
  }
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  
  if (assets.address) {
    doc.text(assets.address, centerX, companyInfoY, { align: 'center' });
    companyInfoY += 3.5;
  }
  
  if (assets.phone) {
    doc.text(assets.phone, centerX, companyInfoY, { align: 'center' });
  }

  // 3. Job Number on Top Right
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Job Card No.`, 190, headerY + 2, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(data.jobNo, 190, headerY + 7, { align: 'right' });

  // 4. Large "JOB CARD" title below header (right-aligned, compact)
  const titleY = headerY + 15;
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('JOB CARD', 190, titleY, { align: 'right' });
  doc.setFont('helvetica', 'normal');

  // Add horizontal line below JOB CARD (full width excluding margins)
  const lineY = titleY + 2; // Reduced spacing above horizontal line
  doc.setLineWidth(0.5);
  doc.line(20, lineY, 190, lineY);

  // Helper function to draw field with rectangle (full width)
  const drawField = (label: string, value: string, y: number, labelWidth: number = 50) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 20, y);
    
    // Calculate label width dynamically and position rectangle closer
    const labelText = `${label}:`;
    const labelTextWidth = doc.getTextWidth(labelText);
    const valueX = 20 + labelTextWidth + 3; // 3mm gap instead of fixed labelWidth
    const valueWidth = 190 - valueX;
    const rectHeight = 5;
    
    // Draw rectangle around value (full width excluding margins)
    doc.setLineWidth(0.2);
    doc.setDrawColor(0, 0, 0);
    doc.rect(valueX, y - 3.5, valueWidth, rectHeight, 'S');
    
    // Add value text inside rectangle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const valueLines = doc.splitTextToSize(value || '-', valueWidth - 4);
    doc.text(valueLines, valueX + 2, y);
    
    return y + 6.3; // Increased spacing by 0.3mm
  };

  // Client and Date Information Section - add spacing after horizontal line
  let yPos = titleY + 9; // Moved up by 4 points
  doc.setFontSize(9);
  
  // Left side: Client Name and Address
  const labelX = 20;
  const valueX = 60; // Position after label
  const leftValueWidth = 75; // Width for left side values
  
  doc.setFont('helvetica', 'bold');
  doc.text('Name:', labelX, yPos);
  doc.setFont('helvetica', 'normal');
  const nameRectHeight = 5;
  doc.setLineWidth(0.2);
  doc.rect(valueX, yPos - 3.5, leftValueWidth, nameRectHeight, 'S');
  doc.text(data.clientName || '-', valueX + 2, yPos);
  
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Address:', labelX, yPos);
  doc.setFont('helvetica', 'normal');
  const addressRectHeight = 5;
  doc.setLineWidth(0.2);
  doc.rect(valueX, yPos - 3.5, leftValueWidth, addressRectHeight, 'S');
  doc.text(data.clientAddress || '-', valueX + 2, yPos);

  // Right side: Date and Delivery Date (left-aligned labels, positioned to avoid overlap)
  // Left side rectangle ends at: valueX (60) + leftValueWidth (75) = 135
  // Add gap of 10mm, so labels start at 145
  const rightLabelX = 145; // Moved further right to avoid overlap with left side rectangles
  
  // Calculate label widths to position value boxes right after labels
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const dateLabelWidth = doc.getTextWidth('Date:');
  const deliveryDateLabelWidth = doc.getTextWidth('Delivery Date:');
  
  // Position value boxes immediately after labels with small gap (3mm)
  const dateValueX = rightLabelX + dateLabelWidth + 3;
  const deliveryDateValueX = rightLabelX + deliveryDateLabelWidth + 3;
  const rightValueWidth = 190 - Math.max(dateValueX, deliveryDateValueX) - 2; // Fit remaining space with margin
  
  doc.text('Date:', rightLabelX, titleY + 8); // Moved up by 4 points
  doc.setFont('helvetica', 'normal');
  doc.setLineWidth(0.2);
  doc.rect(dateValueX, titleY + 4.5, rightValueWidth, nameRectHeight, 'S'); // Moved up by 4 points
  doc.text(data.jobDate, dateValueX + 2, titleY + 8); // Moved up by 4 points
  
  doc.setFont('helvetica', 'bold');
  doc.text('Delivery Date:', rightLabelX, titleY + 15); // Moved up by 4 points
  doc.setFont('helvetica', 'normal');
  doc.setLineWidth(0.2);
  doc.rect(deliveryDateValueX, titleY + 11.5, rightValueWidth, addressRectHeight, 'S'); // Moved up by 4 points
  doc.text(data.deliveryDate, deliveryDateValueX + 2, titleY + 15); // Moved up by 4 points

  yPos = titleY + 24; // Moved up by 4 points
  
  // Helper function to draw checkboxes with proper alignment and overflow handling
  const drawCheckboxes = (label: string, options: string[], checkedValues: string[], y: number, specialCheck?: (val: string, option: string) => boolean) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const labelText = `${label}:`;
    const labelWidth = doc.getTextWidth(labelText);
    doc.text(labelText, 20, y);
    doc.setFont('helvetica', 'normal');
    // Position checkboxes closer to label
    let currentX = 20 + labelWidth + 5;
    let currentY = y;
    
    options.forEach((option) => {
      const textWidth = doc.getTextWidth(option);
      const checkboxHeight = 3.5;
      const checkboxGap = 3; // Gap between checkbox and text
      const nextX = currentX + checkboxHeight + checkboxGap + textWidth + 8;
      
      // Check if would overflow, move to next line if needed
      if (nextX > 190) {
        currentY += 5.5; // Reduced spacing
        currentX = 20 + labelWidth + 5;
      }
      
      // Align checkbox with text - position checkbox center to align with text baseline
      // Text baseline is at currentY, checkbox center should be at currentY
      // Checkbox height is 3.5mm, so top should be at currentY - 1.75
      // Adjust slightly to better align visually
      const checkboxTop = currentY - 2.3; // Adjusted to align checkbox center with text baseline
      
      doc.setLineWidth(0.3);
      doc.rect(currentX, checkboxTop, checkboxHeight, checkboxHeight, 'S');
      
      const isChecked = specialCheck 
        ? specialCheck(checkedValues.join(','), option)
        : checkedValues.some(val => val === option || (option === 'Cover' && val.includes('Outer')));
      if (isChecked) {
        // Draw X mark centered in checkbox
        const centerX = currentX + checkboxHeight / 2;
        const centerY = checkboxTop + checkboxHeight / 2; // Center of checkbox
        const xSize = 1.2;
        doc.setLineWidth(0.4);
        doc.line(
          centerX - xSize, 
          centerY - xSize, 
          centerX + xSize, 
          centerY + xSize
        );
        doc.line(
          centerX - xSize, 
          centerY + xSize, 
          centerX + xSize, 
          centerY - xSize
        );
        doc.setLineWidth(0.3);
      }
      
      // Align text with checkbox - ensure text is not bold
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(option, currentX + checkboxHeight + checkboxGap, currentY);
      currentX += checkboxHeight + checkboxGap + textWidth + 8;
    });
    
    return currentY + 6.3; // Increased spacing by 0.3mm
  };
  
  // Job Name
  yPos = drawField('Job Name', data.jobName, yPos, 45);
  
  // Job Type checkboxes
  const jobTypeOptions = ['Inner', 'Cover'];
  const checkedJobTypes = data.jobTypes;
  yPos = drawCheckboxes('Job Type', jobTypeOptions, checkedJobTypes, yPos);

  // Quantity and Pages
  yPos = drawField('Quantity', data.quantity.toString(), yPos, 45);
  
  // Pages: BW, Color, and Total Page in single line
  // First value box starts at X = 20 + labelWidth (45) = 65 (same as Quantity and other fields)
  const standardValueX = 20 + 45; // 65mm - same starting point as other fields
  const pagesRectHeight = 5;
  const gapBetweenBoxes = 8; // Gap between value boxes
  const labelGap = 3; // Gap between label and its value box
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  
  // Calculate label widths
  const pagesLabel = 'Pages:';
  const bwLabel = 'BW:';
  const colorLabel = 'Color:';
  const totalPageLabel = 'Total Page:';
  const pagesLabelWidth = doc.getTextWidth(pagesLabel);
  const bwLabelWidth = doc.getTextWidth(bwLabel);
  const colorLabelWidth = doc.getTextWidth(colorLabel);
  const totalPageLabelWidth = doc.getTextWidth(totalPageLabel);
  
  // Calculate box widths - make them smaller so all fit properly
  // We'll use fixed smaller widths for better fit
  const pagesBWValueWidth = 25; // Smaller fixed width
  const colorValueWidth = 25; // Smaller fixed width
  // Total Page width will be calculated dynamically to align with other fields
  
  // First field: Pages: BW
  // "Pages:" label at X=20 (same as other labels)
  doc.text(pagesLabel, 20, yPos);
  // "BW:" label positioned at standardValueX (same position as Quantity data box starts)
  const bwLabelX = standardValueX - bwLabelWidth - labelGap;
  doc.text(bwLabel, bwLabelX, yPos);
  // Value box starts at standardValueX (same point as Quantity box)
  const pagesBWValueX = standardValueX;
  doc.setLineWidth(0.2);
  doc.rect(pagesBWValueX, yPos - 3.5, pagesBWValueWidth, pagesRectHeight, 'S');
  doc.setFont('helvetica', 'normal');
  doc.text(data.totalBWPages.toString(), pagesBWValueX + 2, yPos);
  
  // Second field: Color
  // Position label first, then box after it with gap
  const colorLabelX = pagesBWValueX + pagesBWValueWidth + gapBetweenBoxes;
  doc.setFont('helvetica', 'bold');
  doc.text(colorLabel, colorLabelX, yPos);
  const colorValueX = colorLabelX + colorLabelWidth + labelGap;
  doc.setLineWidth(0.2);
  doc.rect(colorValueX, yPos - 3.5, colorValueWidth, pagesRectHeight, 'S');
  doc.setFont('helvetica', 'normal');
  doc.text(data.totalColorPages.toString(), colorValueX + 2, yPos);
  
  // Third field: Total Page
  // Position label first, then box after it with gap
  const totalPageLabelX = colorValueX + colorValueWidth + gapBetweenBoxes;
  doc.setFont('helvetica', 'bold');
  doc.text(totalPageLabel, totalPageLabelX, yPos);
  const totalPageValueX = totalPageLabelX + totalPageLabelWidth + labelGap;
  // Calculate width to align with other single-line fields (like Job Name, Quantity, etc.)
  // Other fields extend from standardValueX (65mm) to 190mm, giving width of 125mm
  // Total Page should end at the same right edge (190mm) to align with other fields
  // Extend 2mm outward (points) to match the end of other rectangles
  const totalPageValueWidth = Math.max(0, 190 - totalPageValueX);
  doc.setLineWidth(0.2);
  doc.rect(totalPageValueX, yPos - 3.5, totalPageValueWidth, pagesRectHeight, 'S');
  doc.setFont('helvetica', 'normal');
  doc.text(data.totalPages.toString(), totalPageValueX + 2, yPos);
  
  yPos += 6.3; // Increased spacing by 0.3mm
  
  // Page Color and Finish Size in same line
  if (data.pageColor || data.bookSize) {
    const rectHeight = 5;
    const gapBetweenBoxes = 8;
    const labelGap = 3;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    
    // Page Color
    if (data.pageColor) {
      const pageColorLabel = 'Page Color:';
      const pageColorValue = data.pageColor === 'Other' && data.pageColorOther ? data.pageColorOther : data.pageColor;
      const pageColorLabelWidth = doc.getTextWidth(pageColorLabel);
      doc.text(pageColorLabel, 20, yPos);
      const pageColorValueX = 20 + pageColorLabelWidth + labelGap;
      const pageColorValueWidth = 50;
      doc.setLineWidth(0.2);
      doc.rect(pageColorValueX, yPos - 3.5, pageColorValueWidth, rectHeight, 'S');
      doc.setFont('helvetica', 'normal');
      doc.text(pageColorValue, pageColorValueX + 2, yPos);
    }
    
    // Finish Size
    if (data.bookSize) {
      const finishSizeLabel = 'Finish Size:';
      const finishSizeValue = data.bookSize === 'Other' && data.bookSizeOther ? data.bookSizeOther : data.bookSize;
      const finishSizeLabelX = data.pageColor ? (20 + doc.getTextWidth('Page Color:') + 3 + 50 + gapBetweenBoxes) : 20;
      doc.setFont('helvetica', 'bold');
      const finishSizeLabelWidth = doc.getTextWidth(finishSizeLabel);
      doc.text(finishSizeLabel, finishSizeLabelX, yPos);
      const finishSizeValueX = finishSizeLabelX + finishSizeLabelWidth + labelGap;
      const finishSizeValueWidth = 190 - finishSizeValueX;
      doc.setLineWidth(0.2);
      doc.rect(finishSizeValueX, yPos - 3.5, finishSizeValueWidth, rectHeight, 'S');
      doc.setFont('helvetica', 'normal');
      doc.text(finishSizeValue, finishSizeValueX + 2, yPos);
    }
    
    yPos += 6.3; // Increased spacing by 0.3mm
  }
  
  // Total Plate and Total Farma in same line
  if (data.totalPlate || data.totalFarma) {
    const rectHeight = 5;
    const gapBetweenBoxes = 8;
    const labelGap = 3;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    
    // Total Plate
    if (data.totalPlate) {
      const totalPlateLabel = 'Total Plate:';
      const totalPlateLabelWidth = doc.getTextWidth(totalPlateLabel);
      doc.text(totalPlateLabel, 20, yPos);
      const totalPlateValueX = 20 + totalPlateLabelWidth + labelGap;
      const totalPlateValueWidth = 40;
      doc.setLineWidth(0.2);
      doc.rect(totalPlateValueX, yPos - 3.5, totalPlateValueWidth, rectHeight, 'S');
      doc.setFont('helvetica', 'normal');
      doc.text(data.totalPlate, totalPlateValueX + 2, yPos);
    }
    
    // Total Farma
    if (data.totalFarma) {
      const totalFarmaLabel = 'Total Farma:';
      const totalFarmaLabelX = data.totalPlate ? (20 + doc.getTextWidth('Total Plate:') + 3 + 40 + gapBetweenBoxes) : 20;
      doc.setFont('helvetica', 'bold');
      const totalFarmaLabelWidth = doc.getTextWidth(totalFarmaLabel);
      doc.text(totalFarmaLabel, totalFarmaLabelX, yPos);
      const totalFarmaValueX = totalFarmaLabelX + totalFarmaLabelWidth + labelGap;
      const totalFarmaValueWidth = 190 - totalFarmaValueX;
      doc.setLineWidth(0.2);
      doc.rect(totalFarmaValueX, yPos - 3.5, totalFarmaValueWidth, rectHeight, 'S');
      doc.setFont('helvetica', 'normal');
      doc.text(data.totalFarma, totalFarmaValueX + 2, yPos);
    }
    
    yPos += 6.3; // Increased spacing by 0.3mm
  }
  
  // Plate By
  const plateByCheck = (val: string, option: string) => {
    return val === option || (option === 'Company' && (val === 'Company' || val === 'Swift Print'));
  };
  yPos = drawCheckboxes('Plate By', ['Company', 'Customer'], [data.plateBy], yPos, plateByCheck);
  
  // Plate From and Plate Size in same line
  if (data.plateFrom || data.plateSize) {
    const standardValueX = 20 + 45;
    const rectHeight = 5;
    const gapBetweenBoxes = 8;
    const labelGap = 3;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    
    // Plate From
    if (data.plateFrom) {
      const plateFromLabel = 'Plate From:';
      const plateFromLabelWidth = doc.getTextWidth(plateFromLabel);
      doc.text(plateFromLabel, 20, yPos);
      const plateFromValueX = 20 + plateFromLabelWidth + labelGap;
      const plateFromValueWidth = 60;
      doc.setLineWidth(0.2);
      doc.rect(plateFromValueX, yPos - 3.5, plateFromValueWidth, rectHeight, 'S');
      doc.setFont('helvetica', 'normal');
      doc.text(data.plateFrom, plateFromValueX + 2, yPos);
    }
    
    // Plate Size
    if (data.plateSize) {
      const plateSizeValue = data.plateSize === 'Other' && data.plateSizeOther ? data.plateSizeOther : data.plateSize;
      const plateSizeLabel = 'Plate Size:';
      const plateSizeLabelX = data.plateFrom ? (20 + doc.getTextWidth('Plate From:') + 3 + 60 + gapBetweenBoxes) : 20;
      doc.setFont('helvetica', 'bold');
      const plateSizeLabelWidth = doc.getTextWidth(plateSizeLabel);
      doc.text(plateSizeLabel, plateSizeLabelX, yPos);
      const plateSizeValueX = plateSizeLabelX + plateSizeLabelWidth + labelGap;
      const plateSizeValueWidth = 190 - plateSizeValueX;
      doc.setLineWidth(0.2);
      doc.rect(plateSizeValueX, yPos - 3.5, plateSizeValueWidth, rectHeight, 'S');
      doc.setFont('helvetica', 'normal');
      doc.text(plateSizeValue, plateSizeValueX + 2, yPos);
    }
    
    yPos += 6.3; // Increased spacing by 0.3mm
  }
  
  // Paper By
  if (data.paperBy) {
    const paperByCheck = (val: string, option: string) => {
      return val === option;
    };
    yPos = drawCheckboxes('Paper By', ['Customer', 'Company'], [data.paperBy === 'customer' ? 'Customer' : 'Company'], yPos, paperByCheck);
    
    if (data.paperBy === 'company' && data.paperFromCustom) {
      yPos = drawField('Page From', data.paperFromCustom, yPos, 45);
    }
  }
  
  // Paper Details (when paperBy is 'customer' and paperDetails exist)
  if (data.paperBy === 'customer' && data.paperDetails && data.paperDetails.length > 0) {
    // Display each paper detail
    data.paperDetails.forEach((paperDetail, index) => {
      if (index > 0) {
        yPos += 1; // Increased spacing by 0.3mm between paper entries
      } else {
        // Reduce gap above first paper entry
        yPos -= 1;
      }
      
      // Paper header (only once per paper)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`Paper ${index + 1}:`, 20, yPos);
      yPos += 6.3; // Increased spacing by 0.3mm
      
      // First line: Type, Size, Weight
      const rectHeight = 5;
      const gapBetweenBoxes = 5;
      const labelGap = 3;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      
      // Type
      const typeLabel = 'Type:';
      const typeLabelWidth = doc.getTextWidth(typeLabel);
      doc.text(typeLabel, 20, yPos);
      const typeValueX = 20 + typeLabelWidth + labelGap;
      const typeValueWidth = 30;
      doc.setLineWidth(0.2);
      doc.rect(typeValueX, yPos - 3.5, typeValueWidth, rectHeight, 'S');
      doc.setFont('helvetica', 'normal');
      doc.text(paperDetail.type, typeValueX + 2, yPos);
      
      // Size
      const sizeLabel = 'Size:';
      doc.setFont('helvetica', 'bold');
      const sizeLabelX = typeValueX + typeValueWidth + gapBetweenBoxes;
      const sizeLabelWidth = doc.getTextWidth(sizeLabel);
      doc.text(sizeLabel, sizeLabelX, yPos);
      const sizeValueX = sizeLabelX + sizeLabelWidth + labelGap;
      const sizeValueWidth = 30;
      doc.setLineWidth(0.2);
      doc.rect(sizeValueX, yPos - 3.5, sizeValueWidth, rectHeight, 'S');
      doc.setFont('helvetica', 'normal');
      doc.text(paperDetail.size, sizeValueX + 2, yPos);
      
      // Weight
      const weightLabel = 'Weight:';
      doc.setFont('helvetica', 'bold');
      const weightLabelX = sizeValueX + sizeValueWidth + gapBetweenBoxes;
      const weightLabelWidth = doc.getTextWidth(weightLabel);
      doc.text(weightLabel, weightLabelX, yPos);
      const weightValueX = weightLabelX + weightLabelWidth + labelGap;
      const weightValueWidth = 190 - weightValueX; // Full width remaining
      doc.setLineWidth(0.2);
      doc.rect(weightValueX, yPos - 3.5, weightValueWidth, rectHeight, 'S');
      doc.setFont('helvetica', 'normal');
      doc.text(paperDetail.weight, weightValueX + 2, yPos);
      
      yPos += 6.3; // Increased spacing by 0.3mm
      
      // Second line: From (full width)
      const fromLabel = 'From:';
      doc.setFont('helvetica', 'bold');
      const fromLabelWidth = doc.getTextWidth(fromLabel);
      doc.text(fromLabel, 20, yPos);
      const fromValueX = 20 + fromLabelWidth + labelGap;
      const fromValueWidth = 190 - fromValueX; // Full width
      doc.setLineWidth(0.2);
      doc.rect(fromValueX, yPos - 3.5, fromValueWidth, rectHeight, 'S');
      doc.setFont('helvetica', 'normal');
      const fromText = doc.splitTextToSize(paperDetail.paperFrom, fromValueWidth - 4);
      doc.text(fromText, fromValueX + 2, yPos);
      
      yPos += 6.3; // Increased spacing by 0.3mm
      
      // Third line: Unit, Issued Qty, Wastage
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      
      // Unit
      const unitLabel = 'Unit:';
      const unitLabelWidth = doc.getTextWidth(unitLabel);
      doc.text(unitLabel, 20, yPos);
      const unitValueX = 20 + unitLabelWidth + labelGap;
      const unitValueWidth = 30;
      doc.setLineWidth(0.2);
      doc.rect(unitValueX, yPos - 3.5, unitValueWidth, rectHeight, 'S');
      doc.setFont('helvetica', 'normal');
      doc.text(paperDetail.unit, unitValueX + 2, yPos);
      
      // Issued Qty
      const issuedQtyLabel = 'Issued Qty:';
      doc.setFont('helvetica', 'bold');
      const issuedQtyLabelX = unitValueX + unitValueWidth + gapBetweenBoxes;
      const issuedQtyLabelWidth = doc.getTextWidth(issuedQtyLabel);
      doc.text(issuedQtyLabel, issuedQtyLabelX, yPos);
      const issuedQtyValueX = issuedQtyLabelX + issuedQtyLabelWidth + labelGap;
      const issuedQtyValueWidth = 30;
      doc.setLineWidth(0.2);
      doc.rect(issuedQtyValueX, yPos - 3.5, issuedQtyValueWidth, rectHeight, 'S');
      doc.setFont('helvetica', 'normal');
      doc.text(paperDetail.issuedQuantity.toString(), issuedQtyValueX + 2, yPos);
      
      // Wastage
      const wastageLabel = 'Wastage:';
      doc.setFont('helvetica', 'bold');
      const wastageLabelX = issuedQtyValueX + issuedQtyValueWidth + gapBetweenBoxes;
      const wastageLabelWidth = doc.getTextWidth(wastageLabel);
      doc.text(wastageLabel, wastageLabelX, yPos);
      const wastageValueX = wastageLabelX + wastageLabelWidth + labelGap;
      const wastageValueWidth = Math.max(0, 190 - wastageValueX);
      doc.setLineWidth(0.2);
      doc.rect(wastageValueX, yPos - 3.5, wastageValueWidth, rectHeight, 'S');
      doc.setFont('helvetica', 'normal');
      doc.text(paperDetail.wastage.toString(), wastageValueX + 2, yPos);
      
      yPos += 6.3; // Increased spacing by 0.3mm
    });
  } else {
    // Fallback to old fields for backward compatibility
    // Paper Type
    const paperTypeValue = data.paperType || data.paperName || '-';
    yPos = drawField('Paper Type', paperTypeValue, yPos, 45);
    
    // Paper Size
    yPos = drawField('Paper Size', data.paperSize, yPos, 45);
    
    // Paper From (Client Name)
    if (data.paperFrom) {
      yPos = drawField('Paper From', data.paperFrom, yPos, 45);
    }
    
    // Paper Weight
    if (data.paperWeight) {
      yPos = drawField('Paper Weight', data.paperWeight, yPos, 45);
    }
  }
  
  // Machine
  yPos = drawField('Machine', data.machineName, yPos, 45);
  
  // Lamination Thermal and Normal in same line
  if (data.laminationThermal || data.normal) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    let currentX = 20;
    let currentY = yPos;
    const checkboxHeight = 3.5;
    const checkboxGap = 3;
    
    // Lamination Thermal
    if (data.laminationThermal) {
      const labelText = 'Lamination Thermal:';
      const labelWidth = doc.getTextWidth(labelText);
      doc.text(labelText, currentX, currentY);
      currentX += labelWidth + 5;
      
      const laminationOptions = ['Matt', 'Gloss'];
      laminationOptions.forEach((option) => {
        const textWidth = doc.getTextWidth(option);
        const nextX = currentX + checkboxHeight + checkboxGap + textWidth + 8;
        
        if (nextX > 190) {
          currentY += 6.3;
          currentX = 20 + labelWidth + 5;
        }
        
        const checkboxTop = currentY - 1.6; // Adjusted to align checkbox center with text baseline
        doc.setLineWidth(0.3);
        doc.rect(currentX, checkboxTop, checkboxHeight, checkboxHeight, 'S');
        
        if (data.laminationThermal === option) {
          const centerX = currentX + checkboxHeight / 2;
          const centerY = checkboxTop + checkboxHeight / 2; // Center of checkbox
          const xSize = 1.2;
          doc.setLineWidth(0.4);
          doc.line(centerX - xSize, centerY - xSize, centerX + xSize, centerY + xSize);
          doc.line(centerX - xSize, centerY + xSize, centerX + xSize, centerY - xSize);
          doc.setLineWidth(0.3);
        }
        
        // Ensure text is not bold
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(option, currentX + checkboxHeight + checkboxGap, currentY);
        currentX += checkboxHeight + checkboxGap + textWidth + 8;
      });
    }
    
    // Normal
    if (data.normal) {
      // Move to next line if needed
      if (currentX > 140) {
        currentY += 6.3;
        currentX = 20;
      } else {
        currentX += 10; // Add gap between groups
      }
      
      const labelText = 'Normal:';
      const labelWidth = doc.getTextWidth(labelText);
      doc.setFont('helvetica', 'bold');
      doc.text(labelText, currentX, currentY);
      currentX += labelWidth + 5;
      
      const normalOptions = ['Matt', 'Gloss'];
      normalOptions.forEach((option) => {
        const textWidth = doc.getTextWidth(option);
        const nextX = currentX + checkboxHeight + checkboxGap + textWidth + 8;
        
        if (nextX > 190) {
          currentY += 6.3;
          currentX = 20 + labelWidth + 5;
        }
        
        const checkboxTop = currentY - 1.6; // Adjusted to align checkbox center with text baseline
        doc.setLineWidth(0.3);
        doc.rect(currentX, checkboxTop, checkboxHeight, checkboxHeight, 'S');
        
        if (data.normal === option) {
          const centerX = currentX + checkboxHeight / 2;
          const centerY = checkboxTop + checkboxHeight / 2; // Center of checkbox
          const xSize = 1.2;
          doc.setLineWidth(0.4);
          doc.line(centerX - xSize, centerY - xSize, centerX + xSize, centerY + xSize);
          doc.line(centerX - xSize, centerY + xSize, centerX + xSize, centerY - xSize);
          doc.setLineWidth(0.3);
        }
        
        // Ensure text is not bold
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(option, currentX + checkboxHeight + checkboxGap, currentY);
        currentX += checkboxHeight + checkboxGap + textWidth + 8;
      });
    }
    
    yPos = currentY + 5.5; // Reduced spacing
  }
  
  // Folding
  const foldingValue = data.folding ? 'Yes' : 'No';
  yPos = drawCheckboxes('Folding', ['Yes', 'No'], [foldingValue], yPos);
  
  // Binding and Stitch in same line
  if (data.binding || data.stitch) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    let currentX = 20;
    let currentY = yPos;
    const checkboxHeight = 3.5;
    const checkboxGap = 3;
    
    // Binding
    if (data.binding) {
      const bindingValue = data.binding === 'Other' && data.bindingOther ? data.bindingOther : data.binding;
      const labelText = 'Binding:';
      const labelWidth = doc.getTextWidth(labelText);
      doc.text(labelText, currentX, currentY);
      currentX += labelWidth + 5;
      
      const bindingOptions = ['Perfect', 'Hard Cover'];
      bindingOptions.forEach((option) => {
        const textWidth = doc.getTextWidth(option);
        const nextX = currentX + checkboxHeight + checkboxGap + textWidth + 8;
        
        if (nextX > 190) {
          currentY += 6.3;
          currentX = 20 + labelWidth + 5;
        }
        
        const checkboxTop = currentY - 1.6; // Adjusted to align checkbox center with text baseline
        doc.setLineWidth(0.3);
        doc.rect(currentX, checkboxTop, checkboxHeight, checkboxHeight, 'S');
        
        if (bindingValue === option) {
          const centerX = currentX + checkboxHeight / 2;
          const centerY = checkboxTop + checkboxHeight / 2; // Center of checkbox
          const xSize = 1.2;
          doc.setLineWidth(0.4);
          doc.line(centerX - xSize, centerY - xSize, centerX + xSize, centerY + xSize);
          doc.line(centerX - xSize, centerY + xSize, centerX + xSize, centerY - xSize);
          doc.setLineWidth(0.3);
        }
        
        // Ensure text is not bold
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(option, currentX + checkboxHeight + checkboxGap, currentY);
        currentX += checkboxHeight + checkboxGap + textWidth + 8;
      });
    }
    
    // Stitch
    if (data.stitch) {
      // Move to next line if needed
      if (currentX > 140) {
        currentY += 6.3;
        currentX = 20;
      } else {
        currentX += 10; // Add gap between groups
      }
      
      const stitchValue = data.stitch === 'Other' && data.stitchOther ? data.stitchOther : data.stitch;
      const labelText = 'Stitch:';
      const labelWidth = doc.getTextWidth(labelText);
      doc.setFont('helvetica', 'bold');
      doc.text(labelText, currentX, currentY);
      currentX += labelWidth + 5;
      
      const stitchOptions = ['Center', 'Side'];
      stitchOptions.forEach((option) => {
        const textWidth = doc.getTextWidth(option);
        const nextX = currentX + checkboxHeight + checkboxGap + textWidth + 8;
        
        if (nextX > 190) {
          currentY += 6.3;
          currentX = 20 + labelWidth + 5;
        }
        
        const checkboxTop = currentY - 1.6; // Adjusted to align checkbox center with text baseline
        doc.setLineWidth(0.3);
        doc.rect(currentX, checkboxTop, checkboxHeight, checkboxHeight, 'S');
        
        if (stitchValue === option) {
          const centerX = currentX + checkboxHeight / 2;
          const centerY = checkboxTop + checkboxHeight / 2; // Center of checkbox
          const xSize = 1.2;
          doc.setLineWidth(0.4);
          doc.line(centerX - xSize, centerY - xSize, centerX + xSize, centerY + xSize);
          doc.line(centerX - xSize, centerY + xSize, centerX + xSize, centerY - xSize);
          doc.setLineWidth(0.3);
        }
        
        // Ensure text is not bold
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(option, currentX + checkboxHeight + checkboxGap, currentY);
        currentX += checkboxHeight + checkboxGap + textWidth + 8;
      });
    }
    
    yPos = currentY + 5.5; // Reduced spacing
  }
  
  // Additional Services
  if (data.additional && data.additional.length > 0) {
    const additionalOptions = ['Hot Foil', 'Emboss', 'UV', 'Numbering', 'Perfecting'];
    yPos = drawCheckboxes('Additional', additionalOptions, data.additional, yPos);
  }
  
  // Related To Job
  if (data.relatedToJobNo) {
    yPos = drawField('Related to', data.relatedToJobNo, yPos, 45);
  }
  
  // Remarks
  if (data.remarks) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Remarks:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    const remarksRectHeight = 12;
    doc.setLineWidth(0.2);
    doc.rect(20, yPos + 1, 170, remarksRectHeight, 'S');
    const remarksLines = doc.splitTextToSize(data.remarks, 166);
    doc.text(remarksLines, 22, yPos + 6);
    yPos += remarksRectHeight + 4.3; // Increased spacing by 0.3mm
  }
  
  // Add proportional gap above Special Instructions
  yPos += 2; // Reduced spacing above Special Instructions
  
  // Special Instructions
  if (data.specialInstructions) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Special Instruction:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    const instructionRectHeight = 12;
    doc.setLineWidth(0.2);
    doc.rect(20, yPos + 1, 170, instructionRectHeight, 'S');
    const instructionLines = doc.splitTextToSize(data.specialInstructions, 166);
    doc.text(instructionLines, 22, yPos + 6);
    yPos += instructionRectHeight + 4.3; // Increased spacing by 0.3mm
  }

  // Add company assets (stamp, signature) - logo already added in header
  await addCompanyAssets(doc, assets, yPos, true, true, 'left');

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
  clientName?: string;
  jobNo?: string;
  destination: string;
  remarks?: string;
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

  doc.text(`Challan No: ${data.challanNumber}`, 20, yPos);
  yPos += 7;
  doc.text(`Date: ${data.challanDate}`, 20, yPos);
  yPos += 7;
  if (data.clientName) {
    doc.text(`Client: ${data.clientName}`, 20, yPos);
    yPos += 7;
  }
  if (data.jobNo) {
    doc.text(`Job No: ${data.jobNo}`, 20, yPos);
    yPos += 7;
  }
  doc.text(`Destination: ${data.destination}`, 20, yPos);
  yPos += 7;
  if (data.remarks) {
    doc.text(`Remarks: ${data.remarks}`, 20, yPos);
    yPos += 7;
  }
  yPos += 3;

  const tableData = data.particulars.map((p) => [
    p.sn.toString(),
    p.particulars,
    p.quantity.toFixed(2),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['SN', 'Particulars', 'Quantity']],
    body: tableData,
    theme: 'grid',
    margin: { left: 20, right: 20 },
    headStyles: { fillColor: false, textColor: [0, 0, 0], lineWidth: 0.2 },
    bodyStyles: { fillColor: false, textColor: [0, 0, 0], lineWidth: 0.2 },
    styles: { fontSize: 9, lineWidth: 0.2, lineColor: [0, 0, 0] },
    tableLineWidth: 0.2,
    tableLineColor: [0, 0, 0],
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 40, halign: 'right' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || yPos + 20;
  doc.setFontSize(10);
  doc.text(`Total Units: ${data.totalUnits.toFixed(2)}`, 20, finalY + 10);

  // Add company assets (logo, stamp, signature)
  await addCompanyAssets(doc, assets, finalY + 10);

  doc.save(`Challan-${data.challanNumber}.pdf`);
}

// Challan Report PDF Export
interface ChallanReportData {
  date: string;
  jobNo: string;
  challanNo: string;
  particulars: string;
  quantity: number;
  remarks?: string;
}

interface ChallanReportPDFData {
  reportName: string;
  filterType: string;
  filterValue: string;
  finalOrder: number;
  totalIssued: number;
  reportData: ChallanReportData[];
  lastUpdated: string;
}

export async function generateChallanReportPDF(data: ChallanReportPDFData) {
  const assets = await getSettingsForPDF('Challan');
  const doc = new jsPDF();

  // Vertical offset when letterhead is present
  const letterheadOffset = assets.letterhead ? 40 : 0;

  // Add letterhead background if configured
  if (assets.letterhead) {
    await addLetterheadBackground(doc, assets.letterhead);
  }

  doc.setFontSize(20);
  doc.text('CHALLAN REPORT', 105, 20 + letterheadOffset, { align: 'center' });

  let yPos = 35 + letterheadOffset;
  doc.setFontSize(10);

  // Report header
  doc.setFontSize(14);
  doc.text(data.reportName, 105, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.text(`Filter: ${data.filterType} - ${data.filterValue}`, 20, yPos);
  yPos += 7;
  doc.text(`Last Updated: ${data.lastUpdated}`, 20, yPos);
  yPos += 10;

  // Summary section
  doc.setFontSize(11);
  doc.text(`Final Order: ${data.finalOrder}`, 20, yPos);
  yPos += 7;
  doc.text(`Total Issued: ${data.totalIssued}`, 20, yPos);
  yPos += 10;

  // Report data table
  const tableData = data.reportData.map((item) => [
    item.date,
    item.jobNo,
    item.challanNo,
    item.particulars,
    item.quantity.toString(),
    item.remarks || '-',
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Date', 'Job No', 'Challan No', 'Particulars', 'Quantity', 'Remarks']],
    body: tableData,
    theme: 'grid',
    margin: { left: 20, right: 20 },
    headStyles: { fillColor: false, textColor: [0, 0, 0], lineWidth: 0.2 },
    bodyStyles: { fillColor: false, textColor: [0, 0, 0], lineWidth: 0.2 },
    styles: { fontSize: 9, lineWidth: 0.2, lineColor: [0, 0, 0] },
    tableLineWidth: 0.2,
    tableLineColor: [0, 0, 0],
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 22 },
      2: { cellWidth: 22 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 30 },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || yPos + 20;

  // Add company assets (logo, stamp, signature)
  await addCompanyAssets(doc, assets, finalY + 10);

  doc.save(`Challan-Report-${data.reportName}.pdf`);
}

// Paper Stock PDF Export
interface PaperStockPDFData {
  paper: {
    clientName: string;
    paperType: string;
    paperSize: string;
    paperWeight: string;
    units: string;
    originalStock: number;
  };
  stockEntries: Array<{
    date: string;
    jobNo?: string;
    jobName?: string;
    issuedPaper: number;
    wastage: number;
    addedStock?: number;
    remaining: number;
    remarks?: string;
  }>;
}

export async function generatePaperStockPDF(data: PaperStockPDFData) {
  const assets = await getSettingsForPDF('Challan');
  const doc = new jsPDF();

  // Vertical offset when letterhead is present
  const letterheadOffset = assets.letterhead ? 40 : 0;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginBottom = 30; // Space for footer/company assets

  // Helper function to add header and paper details
  const addHeaderAndDetails = (currentDoc: jsPDF, isFirstPage: boolean) => {
    if (isFirstPage && assets.letterhead) {
      // Letterhead is already added on first page
    } else if (!isFirstPage) {
      // Add letterhead on subsequent pages if configured
      if (assets.letterhead) {
        // We'll add it in the main flow
      }
    }

    if (isFirstPage) {
      currentDoc.setFontSize(20);
      currentDoc.text('PAPER STOCK REPORT', pageWidth / 2, 20 + letterheadOffset, { align: 'center' });
    } else {
      currentDoc.setFontSize(20);
      currentDoc.text('PAPER STOCK REPORT (Continued)', pageWidth / 2, 20, { align: 'center' });
    }

    let yPos = isFirstPage ? 35 + letterheadOffset : 30;

    // Paper details (only on first page)
    if (isFirstPage) {
      currentDoc.setFontSize(12);
      currentDoc.text(`Client: ${data.paper.clientName}`, 20, yPos);
      yPos += 7;
      currentDoc.text(`Type: ${data.paper.paperType}`, 20, yPos);
      yPos += 7;
      currentDoc.text(`Size: ${data.paper.paperSize} | Weight: ${data.paper.paperWeight}`, 20, yPos);
      yPos += 7;
      currentDoc.text(`Original Stock: ${data.paper.originalStock} ${data.paper.units}`, 20, yPos);
      yPos += 10;
    } else {
      yPos += 5;
    }

    return yPos;
  };

  // Add letterhead background if configured (first page only)
  if (assets.letterhead) {
    await addLetterheadBackground(doc, assets.letterhead);
  }

  let startY = addHeaderAndDetails(doc, true);
  let currentPage = 1;
  let entryIndex = 0;

  // Stock entries table with pagination
  while (entryIndex < data.stockEntries.length) {
    // Calculate how many entries can fit on current page
    const remainingSpace = pageHeight - startY - marginBottom;
    const estimatedRowHeight = 7;
    const maxRows = Math.floor(remainingSpace / estimatedRowHeight) - 1; // -1 for header row

    // Get entries for current page
    const entriesForPage = data.stockEntries.slice(entryIndex, entryIndex + maxRows);
    
    const tableData = entriesForPage.map((entry) => {
      return [
        entry.date,
        entry.jobNo || '-',
        entry.jobName || '-',
        entry.issuedPaper.toString(),
        entry.wastage.toString(),
        (entry.addedStock && entry.addedStock > 0) ? `+${entry.addedStock}` : '-',
        entry.remaining.toString(),
        entry.remarks || '-',
      ];
    });

    // Calculate available width (A4 width is 210mm, minus margins)
    const availableWidth = pageWidth - 40; // 20mm margin on each side
    
    autoTable(doc, {
      startY: startY,
      head: [['Date', 'Job No', 'Job Name', 'Issued Paper', 'Wastage', 'Added Stock', 'Remaining', 'Remarks']],
      body: tableData,
      theme: 'grid',
      margin: { left: 20, right: 20 },
      headStyles: { fillColor: false, textColor: [0, 0, 0], lineWidth: 0.2 },
      bodyStyles: { fillColor: false, textColor: [0, 0, 0], lineWidth: 0.2 },
      styles: { fontSize: 8, lineWidth: 0.2, lineColor: [0, 0, 0] },
      tableLineWidth: 0.2,
      tableLineColor: [0, 0, 0],
      columnStyles: {
        0: { cellWidth: availableWidth * 0.12 }, // Date
        1: { cellWidth: availableWidth * 0.11 }, // Job No
        2: { cellWidth: availableWidth * 0.15 }, // Job Name
        3: { cellWidth: availableWidth * 0.11, halign: 'right' }, // Issued Paper
        4: { cellWidth: availableWidth * 0.11, halign: 'right' }, // Wastage
        5: { cellWidth: availableWidth * 0.11, halign: 'right' }, // Added Stock
        6: { cellWidth: availableWidth * 0.11, halign: 'right' }, // Remaining
        7: { cellWidth: availableWidth * 0.18 }, // Remarks
      },
    });

    entryIndex += entriesForPage.length;
    const finalY = (doc as any).lastAutoTable.finalY || startY + 20;

    // Check if we need another page
    if (entryIndex < data.stockEntries.length) {
      doc.addPage();
      currentPage++;
      
      // Add letterhead on new page if configured
      if (assets.letterhead) {
        await addLetterheadBackground(doc, assets.letterhead);
      }
      
      startY = addHeaderAndDetails(doc, false);
    } else {
      // Last page - add summary and company assets
      const currentRemaining = data.stockEntries.length > 0
        ? data.stockEntries[data.stockEntries.length - 1].remaining
        : data.paper.originalStock;

      doc.setFontSize(10);
      doc.text(`Current Remaining: ${currentRemaining} ${data.paper.units}`, 20, finalY + 10);

      // Add company assets (logo, stamp, signature)
      await addCompanyAssets(doc, assets, finalY + 10);
    }
  }

  doc.save(`Paper-Stock-${data.paper.clientName}-${data.paper.paperSize}.pdf`);
}
