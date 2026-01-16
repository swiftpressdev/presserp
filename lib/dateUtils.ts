import NepaliDate from 'nepali-date-converter';

export function getCurrentBSDate(): string {
  const today = new NepaliDate(new Date());
  const year = today.getYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatBSDate(bsDate: string): string {
  try {
    const [year, month, day] = bsDate.split('-');
    return `${year}/${month}/${day}`;
  } catch (error) {
    return bsDate;
  }
}

export function parseBSDate(bsDateString: string): NepaliDate | null {
  try {
    const [year, month, day] = bsDateString.split('-').map(Number);
    return new NepaliDate(year, month - 1, day);
  } catch (error) {
    console.error('Error parsing BS date:', error);
    return null;
  }
}

export function isValidBSDate(bsDateString: string): boolean {
  try {
    const [year, month, day] = bsDateString.split('-').map(Number);
    if (!year || !month || !day) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 32) return false;
    if (year < 2000 || year > 2100) return false;
    return true;
  } catch (error) {
    return false;
  }
}

export function convertDateToBS(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const bsDate = new NepaliDate(dateObj);
    const year = bsDate.getYear();
    const month = String(bsDate.getMonth() + 1).padStart(2, '0');
    const day = String(bsDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    return '';
  }
}

export function formatBSDateTime(bsDate: string, includeTime: boolean = false): string {
  try {
    const [year, month, day] = bsDate.split('-');
    if (includeTime) {
      // If we need time, we'd need to pass it separately or modify the function
      return `${year}/${month}/${day}`;
    }
    return `${year}/${month}/${day}`;
  } catch (error) {
    return bsDate;
  }
}

export function convertBSToDate(bsDate: string): Date {
  try {
    const [year, month, day] = bsDate.split('-').map(Number);
    const nepaliDate = new NepaliDate(year, month - 1, day);
    return nepaliDate.toJsDate();
  } catch (error) {
    // Return current date if conversion fails
    return new Date();
  }
}
