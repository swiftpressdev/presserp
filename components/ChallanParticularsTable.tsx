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
        <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                SN
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                Particulars
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {particulars.map((particular, index) => (
              <tr key={index}>
                <td className="px-4 py-2 border-r border-gray-300">
                  <input
                    type="number"
                    value={particular.sn}
                    readOnly
                    className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100"
                  />
                </td>
                <td className="px-4 py-2 border-r border-gray-300">
                  <input
                    type="text"
                    value={particular.particulars}
                    onChange={(e) => updateRow(index, 'particulars', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    value={particular.quantity}
                    onChange={(e) => updateRow(index, 'quantity', e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={2} className="px-4 py-3 text-right font-semibold text-gray-700 border-r border-gray-300">
                Total Units:
              </td>
              <td colSpan={2} className="px-4 py-3 text-left font-semibold text-gray-900">
                {totalUnits.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <button
        type="button"
        onClick={addRow}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
      >
        Add Row
      </button>
    </div>
  );
}
