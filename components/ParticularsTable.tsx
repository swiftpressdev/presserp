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
}

export default function ParticularsTable({
  particulars,
  onChange,
  hasVAT,
  onVATChange,
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
  
  let subtotal = 0;
  let vatAmount = 0;
  let grandTotal = total;

  if (hasVAT) {
    subtotal = Number((total / 1.13).toFixed(2));
    vatAmount = Number((subtotal * 0.13).toFixed(2));
    grandTotal = Number((subtotal + vatAmount).toFixed(2));
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

        <div className="flex items-center gap-4">
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
          <>
            <div className="flex items-center justify-between border-t pt-3">
              <span className="font-medium">Subtotal:</span>
              <span>{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">VAT (13%):</span>
              <span>{vatAmount.toFixed(2)}</span>
            </div>
          </>
        )}

        <div className="flex items-center justify-between border-t pt-3">
          <span className="font-bold text-lg">Grand Total:</span>
          <span className="text-xl font-bold text-blue-600">{grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
