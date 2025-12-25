'use client';

import { useState, useMemo } from 'react';

interface Option {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableMultiSelectProps {
  options: Option[];
  selectedValues: string[];
  onChange: (selectedValues: string[]) => void;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  emptyMessage?: string;
  maxHeight?: string;
  maxSelection?: number;
}

export default function SearchableMultiSelect({
  options,
  selectedValues,
  onChange,
  label,
  placeholder = 'Search...',
  disabled = false,
  required = false,
  emptyMessage = 'No options available',
  maxHeight = 'max-h-60',
  maxSelection,
}: SearchableMultiSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    
    const lowerSearch = searchTerm.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(lowerSearch) ||
        option.sublabel?.toLowerCase().includes(lowerSearch)
    );
  }, [options, searchTerm]);

  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      // Check if maxSelection limit is reached
      if (maxSelection !== undefined && selectedValues.length >= maxSelection) {
        return; // Don't allow selection if limit reached
      }
      onChange([...selectedValues, value]);
    }
  };

  const handleSelectAll = () => {
    if (maxSelection !== undefined) {
      // Only select up to maxSelection items
      const itemsToSelect = filteredOptions
        .slice(0, maxSelection)
        .map((opt) => opt.value);
      onChange(itemsToSelect);
    } else {
    onChange(filteredOptions.map((opt) => opt.value));
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
        {selectedValues.length > 0 && (
          <span className="text-xs text-gray-500 ml-2">
            ({selectedValues.length}{maxSelection ? `/${maxSelection}` : ''} selected)
          </span>
        )}
      </label>

      <div className="border border-gray-300 rounded-md shadow-sm bg-white">
        {/* Search Input */}
        <div className="p-3 border-b border-gray-200">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:opacity-50"
          />
        </div>

        {/* Select/Clear All Buttons */}
        {options.length > 0 && !disabled && (
          <div className="px-3 py-2 border-b border-gray-200 flex gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={filteredOptions.length === 0}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Select All {filteredOptions.length !== options.length && `(${filteredOptions.length})`}
              {maxSelection && ` (max ${maxSelection})`}
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={selectedValues.length === 0}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Options List */}
        <div className={`${maxHeight} overflow-y-auto`}>
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              {searchTerm ? 'No matches found' : emptyMessage}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                const isAtMaxSelection = maxSelection !== undefined && selectedValues.length >= maxSelection;
                const isDisabled = disabled || (!isSelected && isAtMaxSelection);
                
                return (
                <label
                  key={option.value}
                    className={`flex items-center px-4 py-3 transition-colors ${
                      isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'
                    }`}
                >
                  <input
                    type="checkbox"
                      checked={isSelected}
                    onChange={() => handleToggle(option.value)}
                      disabled={isDisabled}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                  <span className="ml-3 text-sm flex-1">
                    <span className="font-medium text-gray-900">{option.label}</span>
                    {option.sublabel && (
                      <span className="text-gray-500 ml-2">- {option.sublabel}</span>
                    )}
                  </span>
                </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Validation Messages */}
      {required && selectedValues.length === 0 && options.length > 0 && (
        <p className="mt-1 text-xs text-red-500">Please select at least one option</p>
      )}
      {maxSelection !== undefined && selectedValues.length >= maxSelection && (
        <p className="mt-1 text-xs text-amber-600">
          Maximum selection limit reached ({maxSelection} items)
        </p>
      )}
    </div>
  );
}
