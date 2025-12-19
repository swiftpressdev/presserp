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
  includeSignature: boolean = true
) {
  let xPos = 20;
  
  // Add company logo at top right if available
  if (assets.companyLogo) {
    try {
      const logoData = await loadImageForPDF(assets.companyLogo);
      doc.addImage(logoData, 'PNG', 160, 10, 40, 20, undefined, 'FAST');
    } catch (error) {
      console.error('Failed to add logo:', error);
    }
  }
  
  // Add signature if available
  let signatureY = finalY + 20;
  if (includeSignature && assets.esignature) {
    try {
      const signatureData = await loadImageForPDF(assets.esignature);
      doc.addImage(signatureData, 'PNG', xPos, signatureY, 30, 15, undefined, 'FAST');
      // Add horizontal bar above "Authorized Signature" text
      const textY = signatureY + 18;
      const textWidth = doc.getTextWidth('Authorized Signature');
      doc.setLineWidth(0.2);
      doc.line(xPos, textY - 4, xPos + textWidth, textY - 4);
      // Add "Authorized Signature" text below the signature
      doc.setFontSize(9);
      doc.text('Authorized Signature', xPos, textY);
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

  // Add current date
  const currentDate = formatBSDate(getCurrentBSDate());
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Date: ', 20, 35 + letterheadOffset);
  doc.setFont('helvetica', 'normal');
  const dateX = 20 + doc.getTextWidth('Date: ') + 2;
  doc.text(currentDate, dateX, 35 + letterheadOffset);

  // Quotation No with bold label
  doc.setFont('helvetica', 'bold');
  doc.text('Quotation No: ', 20, 42 + letterheadOffset);
  doc.setFont('helvetica', 'normal');
  const quotationNoX = 20 + doc.getTextWidth('Quotation No: ') + 2;
  doc.text(data.quotationSN, quotationNoX, 42 + letterheadOffset);

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

  // Add company assets (logo, stamp, signature)
  await addCompanyAssets(doc, assets, currentY);

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

  doc.setFontSize(20);
  doc.text('JOB DETAILS', 105, 20 + letterheadOffset, { align: 'center' });

  let yPos = 35 + letterheadOffset;
  doc.setFontSize(10);

  doc.text(`Job No: ${data.jobNo}`, 20, yPos);
  yPos += 7;
  doc.text(`Job Name: ${data.jobName}`, 20, yPos);
  yPos += 7;
  doc.text(`Client: ${data.clientName}`, 20, yPos);
  yPos += 7;
  doc.text(`Job Date: ${data.jobDate}`, 20, yPos);
  yPos += 7;
  doc.text(`Delivery Date: ${data.deliveryDate}`, 20, yPos);
  yPos += 7;
  doc.text(`Job Type: ${data.jobTypes.join(', ')}`, 20, yPos);
  yPos += 7;
  doc.text(`Quantity: ${data.quantity}`, 20, yPos);
  yPos += 7;
  doc.text(`Paper Type: ${data.paperName}`, 20, yPos);
  yPos += 7;
  doc.text(`Paper Size: ${data.paperSize}`, 20, yPos);
  yPos += 7;
  doc.text(`Total Pages: ${data.totalPages} (BW: ${data.totalBWPages}, Color: ${data.totalColorPages})`, 20, yPos);
  yPos += 7;
  
  if (data.pageColor) {
    const pageColorValue = data.pageColor === 'Other' && data.pageColorOther ? data.pageColorOther : data.pageColor;
    doc.text(`Page Color: ${pageColorValue}`, 20, yPos);
    yPos += 7;
  }
  
  if (data.bookSize) {
    const bookSizeValue = data.bookSize === 'Other' && data.bookSizeOther ? data.bookSizeOther : data.bookSize;
    doc.text(`Finish Size: ${bookSizeValue}`, 20, yPos);
    yPos += 7;
  }
  
  if (data.totalPlate) {
    doc.text(`Total Plate: ${data.totalPlate}`, 20, yPos);
    yPos += 7;
  }
  
  if (data.totalFarma) {
    doc.text(`Total Farma: ${data.totalFarma}`, 20, yPos);
    yPos += 7;
  }
  
  doc.text(`Plate By: ${data.plateBy}`, 20, yPos);
  yPos += 7;
  
  if (data.plateFrom) {
    doc.text(`Plate From: ${data.plateFrom}`, 20, yPos);
    yPos += 7;
  }
  
  if (data.plateSize) {
    const plateSizeValue = data.plateSize === 'Other' && data.plateSizeOther ? data.plateSizeOther : data.plateSize;
    doc.text(`Plate Size: ${plateSizeValue}`, 20, yPos);
    yPos += 7;
  }
  
  doc.text(`Machine: ${data.machineName}`, 20, yPos);
  yPos += 7;
  
  if (data.laminationThermal) {
    doc.text(`Lamination Thermal: ${data.laminationThermal}`, 20, yPos);
    yPos += 7;
  }
  
  if (data.normal) {
    doc.text(`Normal: ${data.normal}`, 20, yPos);
    yPos += 7;
  }
  
  doc.text(`Folding: ${data.folding ? 'Yes' : 'No'}`, 20, yPos);
  yPos += 7;
  
  if (data.binding) {
    const bindingValue = data.binding === 'Other' && data.bindingOther ? data.bindingOther : data.binding;
    doc.text(`Binding: ${bindingValue}`, 20, yPos);
    yPos += 7;
  }
  
  if (data.stitch) {
    const stitchValue = data.stitch === 'Other' && data.stitchOther ? data.stitchOther : data.stitch;
    doc.text(`Stitch: ${stitchValue}`, 20, yPos);
    yPos += 7;
  }
  
  if (data.additional && data.additional.length > 0) {
    doc.text(`Additional Services: ${data.additional.join(', ')}`, 20, yPos);
    yPos += 7;
  }
  
  if (data.relatedToJobNo) {
    doc.text(`Related To Job: ${data.relatedToJobNo}`, 20, yPos);
    yPos += 7;
  }
  
  if (data.remarks) {
    doc.text(`Remarks: ${data.remarks}`, 20, yPos);
    yPos += 7;
  }
  
  if (data.specialInstructions) {
    doc.text(`Special Instructions: ${data.specialInstructions}`, 20, yPos);
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
  doc.text(`Destination: ${data.destination}`, 20, yPos);
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
