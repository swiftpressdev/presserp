'use client';

import { useState } from 'react';

export interface ChallanParticular {
  sn: number;
  particulars: string;
  quantity: number;
}

interface ChallanParticularsTableProps {
  particulars: ChallanParticular[];
  onChange: (particulars: ChallanParticular[]) => void;
}

export default function ChallanParticularsTable({
  particulars,
  onChange,
}: ChallanParticularsTableProps) {
  const addRow = () => {
    const newParticular: ChallanParticular = {
      sn: particulars.length + 1,
      particulars: '',
      quantity: 0,
    };
    onChange([...particulars, newParticular]);
  };

  const removeRow = (index: number) => {
    const updated = particulars.filter((_, i) => i !== index);
    const reindexed = updated.map((item, i) => ({ ...item, sn: i + 1 }));
    onChange(reindexed);
  };

  const updateRow = (index: number, field: keyof ChallanParticular, value: string | number) => {
    const updated = [...particulars];
    
    if (field === 'quantity') {
      const numValue = value === '' || value === null || value === undefined ? 0 : Number(value);
      updated[index] = { ...updated[index], [field]: numValue };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }

    onChange(updated);
  };

  const totalUnits = particulars.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">SN</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Particulars</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Quantity</th>
              <th className="border border-gray-300 px-4 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {particulars.map((particular, index) => (
              <tr key={index}>
                <td className="border border-gray-300 px-4 py-2">{particular.sn}</td>
                <td className="border border-gray-300 px-4 py-2">
                  <input
                    type="text"
                    value={particular.particulars}
                    onChange={(e) => updateRow(index, 'particulars', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded"
                    placeholder="Enter particulars"
                  />
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <input
                    type="number"
                    value={particular.quantity === 0 ? '' : particular.quantity}
                    onChange={(e) => updateRow(index, 'quantity', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded"
                    min="0"
                    step="1"
                    placeholder="0"
                  />
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
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={2} className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-700">
                Total Units:
              </td>
              <td colSpan={2} className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">
                {totalUnits.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <button
        type="button"
        onClick={addRow}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
      >
        Add Row
      </button>
    </div>
  );
}
