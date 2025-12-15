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
