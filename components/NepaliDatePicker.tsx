'use client';

import { NepaliDatePicker as NDP } from 'nepali-datepicker-reactjs';
import 'nepali-datepicker-reactjs/dist/index.css';

interface NepaliDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
}

export default function NepaliDatePicker({
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
  required = false,
  disabled = false,
  className = '',
  inputClassName,
}: NepaliDatePickerProps) {
  const defaultInputClassName = className.includes('w-full')
    ? 'w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:opacity-50'
    : 'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:opacity-50';

  return (
    <div className={className}>
      <NDP
        inputClassName={inputClassName || defaultInputClassName}
        className=""
        value={value}
        onChange={(val: string) => onChange(val)}
        options={{
          calenderLocale: 'ne',
          valueLocale: 'en',
        }}
      />
    </div>
  );
}

