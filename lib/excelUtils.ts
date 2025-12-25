import * as XLSX from 'xlsx';
import { formatBSDate } from './dateUtils';

// Paper Stock Excel Export
interface PaperStockExcelData {
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

export function generatePaperStockExcel(data: PaperStockExcelData) {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Create header row
  const headerRow = [
    ['PAPER STOCK REPORT'],
    [],
    ['Client:', data.paper.clientName],
    ['Type:', data.paper.paperType],
    ['Size:', data.paper.paperSize],
    ['Weight:', data.paper.paperWeight],
    ['Original Stock:', `${data.paper.originalStock} ${data.paper.units}`],
    [],
    ['Date', 'Job No', 'Job Name', 'Issued Paper', 'Wastage', 'Added Stock', 'Remaining', 'Remarks'],
  ];

  // Create data rows
  const dataRows = data.stockEntries.map((entry) => [
    formatBSDate(entry.date),
    entry.jobNo || '-',
    entry.jobName || '-',
    entry.issuedPaper,
    entry.wastage,
    (entry.addedStock && entry.addedStock > 0) ? entry.addedStock : '-',
    entry.remaining,
    entry.remarks || '-',
  ]);

  // Combine header and data
  const worksheetData = [...headerRow, ...dataRows];

  // Add summary row
  const currentRemaining = data.stockEntries.length > 0
    ? data.stockEntries[data.stockEntries.length - 1].remaining
    : data.paper.originalStock;

  worksheetData.push([]);
  worksheetData.push(['Current Remaining:', `${currentRemaining} ${data.paper.units}`]);

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // Date
    { wch: 12 }, // Job No
    { wch: 25 }, // Job Name
    { wch: 15 }, // Issued Paper
    { wch: 12 }, // Wastage
    { wch: 15 }, // Added Stock
    { wch: 15 }, // Remaining
    { wch: 30 }, // Remarks
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Paper Stock');

  // Generate filename
  const fileName = `Paper-Stock-${data.paper.clientName}-${data.paper.paperSize}.xlsx`;

  // Write file
  XLSX.writeFile(workbook, fileName);
}

