import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Particular {
  sn: number;
  particulars: string;
  quantity: number;
  rate: number;
  amount: number;
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

export function generateQuotationPDF(data: QuotationData) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text('QUOTATION', 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`Quotation No: ${data.quotationSN}`, 14, 35);
  doc.text(`Party Name: ${data.partyName}`, 14, 42);
  doc.text(`Address: ${data.address}`, 14, 49);
  doc.text(`Phone: ${data.phoneNumber}`, 14, 56);

  const tableData = data.particulars.map((item) => [
    item.sn,
    item.particulars,
    item.quantity,
    item.rate.toFixed(2),
    item.amount.toFixed(2),
  ]);

  autoTable(doc, {
    startY: 65,
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

export function generateEstimatePDF(data: EstimateData) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text('ESTIMATE', 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`Estimate No: ${data.estimateNumber}`, 14, 35);
  doc.text(`Date: ${data.estimateDate}`, 14, 42);
  doc.text(`Client: ${data.clientName}`, 14, 49);
  doc.text(`Job No: ${data.jobNumber}`, 14, 56);
  doc.text(`Paper Size: ${data.paperSize}`, 14, 63);
  doc.text(
    `Pages: ${data.totalPages} (BW: ${data.totalBWPages}, Color: ${data.totalColorPages})`,
    14,
    70
  );

  const tableData = data.particulars.map((item) => [
    item.sn,
    item.particulars,
    item.quantity,
    item.rate.toFixed(2),
    item.amount.toFixed(2),
  ]);

  autoTable(doc, {
    startY: 78,
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
  plateBy: string;
  plateFrom?: string;
  plateSize?: string;
  machineName: string;
  laminationThermal?: string;
  folding: boolean;
  binding?: string;
  stitch?: string;
  additional?: string[];
  relatedToJobNo?: string;
  remarks?: string;
  specialInstructions?: string;
}

export function generateJobPDF(data: JobData) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text('JOB DETAILS', 105, 20, { align: 'center' });

  let yPos = 35;
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
  doc.text(`Plate By: ${data.plateBy}`, 14, yPos);
  yPos += 7;
  
  if (data.plateFrom) {
    doc.text(`Plate From: ${data.plateFrom}`, 14, yPos);
    yPos += 7;
  }
  
  if (data.plateSize) {
    doc.text(`Plate Size: ${data.plateSize}`, 14, yPos);
    yPos += 7;
  }
  
  doc.text(`Machine: ${data.machineName}`, 14, yPos);
  yPos += 7;
  
  if (data.laminationThermal) {
    doc.text(`Lamination Thermal: ${data.laminationThermal}`, 14, yPos);
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
  }

  doc.save(`Job-${data.jobNo}.pdf`);
}
