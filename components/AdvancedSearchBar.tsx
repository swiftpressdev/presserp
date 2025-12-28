'use client';

import { useState } from 'react';

export interface SearchField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange' | 'number' | 'numberRange';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface AdvancedSearchBarProps {
  fields: SearchField[];
  onSearch: (searchParams: Record<string, any>) => void;
  onReset: () => void;
}

export default function AdvancedSearchBar({ fields, onSearch, onReset }: AdvancedSearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchParams, setSearchParams] = useState<Record<string, any>>({});

  const handleFieldChange = (key: string, value: any) => {
    setSearchParams((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSearch = () => {
    // Filter out empty values
    const filteredParams: Record<string, any> = {};
    Object.keys(searchParams).forEach((key) => {
      const value = searchParams[key];
      if (value !== '' && value !== null && value !== undefined) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          // Handle date range and number range
          const hasValue = Object.values(value).some((v) => v !== '' && v !== null && v !== undefined);
          if (hasValue) {
            filteredParams[key] = value;
          }
        } else {
          filteredParams[key] = value;
        }
      }
    });
    onSearch(filteredParams);
  };

  const handleReset = () => {
    setSearchParams({});
    onReset();
  };

  const renderField = (field: SearchField) => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            placeholder={field.placeholder || `Search ${field.label.toLowerCase()}...`}
            value={searchParams[field.key] || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'select':
        return (
          <select
            value={searchParams[field.key] || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All {field.label}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'date':
        return (
          <input
            type="date"
            value={searchParams[field.key] || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'dateRange':
        return (
          <div className="flex gap-2">
            <input
              type="date"
              placeholder="From"
              value={searchParams[field.key]?.from || ''}
              onChange={(e) =>
                handleFieldChange(field.key, {
                  ...(searchParams[field.key] || {}),
                  from: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              placeholder="To"
              value={searchParams[field.key]?.to || ''}
              onChange={(e) =>
                handleFieldChange(field.key, {
                  ...(searchParams[field.key] || {}),
                  to: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            placeholder={field.placeholder || `Search ${field.label.toLowerCase()}...`}
            value={searchParams[field.key] || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value ? Number(e.target.value) : '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'numberRange':
        return (
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={searchParams[field.key]?.min || ''}
              onChange={(e) =>
                handleFieldChange(field.key, {
                  ...(searchParams[field.key] || {}),
                  min: e.target.value ? Number(e.target.value) : '',
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Max"
              value={searchParams[field.key]?.max || ''}
              onChange={(e) =>
                handleFieldChange(field.key, {
                  ...(searchParams[field.key] || {}),
                  max: e.target.value ? Number(e.target.value) : '',
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Advanced Search
          </button>
        </div>
        {isExpanded && (
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
              {renderField(field)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

