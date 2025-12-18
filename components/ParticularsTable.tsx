'use client';

import { useState } from 'react';

export interface Particular {
  sn: number;
  particulars: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface ParticularsTableProps {
  particulars: Particular[];
  onChange: (particulars: Particular[]) => void;
  hasVAT: boolean;
  onVATChange: (hasVAT: boolean) => void;
  hasDiscount?: boolean;
  onDiscountChange?: (hasDiscount: boolean) => void;
  discountPercentage?: number;
  onDiscountPercentageChange?: (percentage: number) => void;
}

export default function ParticularsTable({
  particulars,
  onChange,
  hasVAT,
  onVATChange,
  hasDiscount = false,
  onDiscountChange,
  discountPercentage = 0,
  onDiscountPercentageChange,
}: ParticularsTableProps) {
  const addRow = () => {
    const newParticular: Particular = {
      sn: particulars.length + 1,
      particulars: '',
      quantity: 0,
      rate: 0,
      amount: 0,
    };
    onChange([...particulars, newParticular]);
  };

  const removeRow = (index: number) => {
    const updated = particulars.filter((_, i) => i !== index);
    const reindexed = updated.map((item, i) => ({ ...item, sn: i + 1 }));
    onChange(reindexed);
  };

  const updateRow = (index: number, field: keyof Particular, value: string | number) => {
    const updated = [...particulars];
    
    // Convert string to number for numeric fields
    if (field === 'quantity' || field === 'rate') {
      const numValue = value === '' || value === null || value === undefined ? 0 : Number(value);
      updated[index] = { ...updated[index], [field]: numValue };
      
      const quantity = field === 'quantity' ? numValue : updated[index].quantity;
      const rate = field === 'rate' ? numValue : updated[index].rate;
      updated[index].amount = Number((quantity * rate).toFixed(2));
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }

    onChange(updated);
  };

  const total = particulars.reduce((sum, item) => sum + item.amount, 0);
  
  // Step 1: Calculate discount (if enabled)
  let discountAmount = 0;
  let priceAfterDiscount = total;
  
  if (hasDiscount && discountPercentage > 0) {
    discountAmount = Number(((total * discountPercentage) / 100).toFixed(2));
    priceAfterDiscount = Number((total - discountAmount).toFixed(2));
  }
  
  // Step 2: Calculate VAT on the discounted price (if enabled)
  let vatAmount = 0;
  let grandTotal = priceAfterDiscount;
  
  if (hasVAT) {
    vatAmount = Number((priceAfterDiscount * 0.13).toFixed(2));
    grandTotal = Number((priceAfterDiscount + vatAmount).toFixed(2));
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">SN</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Particulars</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Quantity</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Rate</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Amount</th>
              <th className="border border-gray-300 px-4 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {particulars.map((item, index) => (
              <tr key={index}>
                <td className="border border-gray-300 px-4 py-2">{item.sn}</td>
                <td className="border border-gray-300 px-4 py-2">
                  <input
                    type="text"
                    value={item.particulars}
                    onChange={(e) => updateRow(index, 'particulars', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded"
                    placeholder="Enter particulars"
                  />
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <input
                    type="number"
                    value={item.quantity === 0 ? '' : item.quantity}
                    onChange={(e) => updateRow(index, 'quantity', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded"
                    min="0"
                    step="1"
                    placeholder="0"
                  />
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <input
                    type="number"
                    value={item.rate === 0 ? '' : item.rate}
                    onChange={(e) => updateRow(index, 'rate', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right">
                  {item.amount.toFixed(2)}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addRow}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
      >
        Add Row
      </button>

      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">Total:</span>
          <span className="text-lg font-semibold">{total.toFixed(2)}</span>
        </div>

        {/* Discount Section */}
        {onDiscountChange && onDiscountPercentageChange && (
          <>
            <div className="flex items-center gap-4 border-t pt-3">
              <label className="font-medium">Apply Discount:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="discount"
                    checked={hasDiscount}
                    onChange={() => onDiscountChange(true)}
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="discount"
                    checked={!hasDiscount}
                    onChange={() => onDiscountChange(false)}
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            {hasDiscount && (
              <div className="flex items-center gap-4">
                <label className="font-medium">Discount %:</label>
                <input
                  type="number"
                  value={discountPercentage === 0 ? '' : discountPercentage}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    onDiscountPercentageChange(Math.max(0, Math.min(100, value)));
                  }}
                  className="w-24 px-3 py-1 border border-gray-300 rounded-md"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0"
                />
              </div>
            )}

            {hasDiscount && discountPercentage > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Discount ({discountPercentage}%):</span>
                  <span className="text-red-600">-{discountAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Price After Discount:</span>
                  <span>{priceAfterDiscount.toFixed(2)}</span>
                </div>
              </>
            )}
          </>
        )}

        {/* VAT Section */}
        <div className="flex items-center gap-4 border-t pt-3">
          <label className="font-medium">VAT (13%):</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="vat"
                checked={hasVAT}
                onChange={() => onVATChange(true)}
              />
              <span>Yes</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="vat"
                checked={!hasVAT}
                onChange={() => onVATChange(false)}
              />
              <span>No</span>
            </label>
          </div>
        </div>

        {hasVAT && (
          <div className="flex items-center justify-between">
            <span className="font-medium">VAT (13%):</span>
            <span>{vatAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-3">
          <span className="font-bold text-lg">Grand Total:</span>
          <span className="text-xl font-bold text-blue-600">{grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
