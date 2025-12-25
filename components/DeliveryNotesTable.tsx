'use client';

import { useState, useEffect } from 'react';
import SearchableMultiSelect from './SearchableMultiSelect';
import NepaliDatePicker from './NepaliDatePicker';
import { getCurrentBSDate } from '@/lib/dateUtils';

export interface DeliveryNote {
  date: string;
  challanNo: string;
  quantity: number;
  remarks?: string;
}

interface Challan {
  _id: string;
  challanNumber: string;
  challanDate: string;
  totalUnits: number;
}

interface DeliveryNotesTableProps {
  deliveryNotes: DeliveryNote[];
  onChange: (deliveryNotes: DeliveryNote[]) => void;
}

export default function DeliveryNotesTable({
  deliveryNotes,
  onChange,
}: DeliveryNotesTableProps) {
  const [challans, setChallans] = useState<Challan[]>([]);
  const [loadingChallans, setLoadingChallans] = useState(false);
  const [selectedChallanIds, setSelectedChallanIds] = useState<string[]>([]);

  useEffect(() => {
    fetchChallans();
  }, []);

  // Initialize selected challan IDs from existing delivery notes
  useEffect(() => {
    if (challans.length > 0 && deliveryNotes.length > 0) {
      const existingChallanIds = deliveryNotes
        .map((note) => {
          if (note.challanNo) {
            const challan = challans.find((c) => c.challanNumber === note.challanNo);
            return challan?._id;
          }
          return undefined;
        })
        .filter((id): id is string => Boolean(id));
      setSelectedChallanIds(existingChallanIds);
    } else if (deliveryNotes.length === 0) {
      setSelectedChallanIds([]);
    }
  }, [challans, deliveryNotes]);

  const fetchChallans = async () => {
    setLoadingChallans(true);
    try {
      const response = await fetch('/api/challans');
      const data = await response.json();
      if (response.ok) {
        setChallans(data.challans || []);
      }
    } catch (error) {
      console.error('Failed to fetch challans:', error);
    } finally {
      setLoadingChallans(false);
    }
  };

  const handleChallanSelection = (selectedIds: string[]) => {
    setSelectedChallanIds(selectedIds);

    // Get selected challans
    const selectedChallans = challans.filter((c) => selectedIds.includes(c._id));
    const selectedChallanNumbers = new Set(selectedChallans.map((c) => c.challanNumber));

    // Keep existing notes that match selected challans (preserve user modifications)
    const existingNotesForSelectedChallans = deliveryNotes.filter((note) =>
      note.challanNo && selectedChallanNumbers.has(note.challanNo)
    );

    // Create delivery notes from newly selected challans (that don't have existing notes)
    const newDeliveryNotes: DeliveryNote[] = selectedChallans
      .filter((challan) => !existingNotesForSelectedChallans.some((note) => note.challanNo === challan.challanNumber))
      .map((challan) => ({
        date: challan.challanDate,
        challanNo: challan.challanNumber,
        quantity: challan.totalUnits,
        remarks: '',
      }));

    // Keep custom rows (rows that don't match any selected challan)
    const customRows = deliveryNotes.filter(
      (note) => !note.challanNo || !selectedChallanNumbers.has(note.challanNo)
    );

    // Combine: existing notes for selected challans + new notes for selected challans + custom rows
    onChange([...existingNotesForSelectedChallans, ...newDeliveryNotes, ...customRows]);
  };

  const addRow = () => {
    const newNote: DeliveryNote = {
      date: getCurrentBSDate(),
      challanNo: '',
      quantity: 0,
      remarks: '',
    };
    onChange([...deliveryNotes, newNote]);
  };

  const removeRow = (index: number) => {
    const noteToRemove = deliveryNotes[index];
    const updated = deliveryNotes.filter((_, i) => i !== index);
    onChange(updated);

    // If removed row had a challan, deselect it from the multi-select
    if (noteToRemove.challanNo) {
      const challan = challans.find((c) => c.challanNumber === noteToRemove.challanNo);
      if (challan) {
        setSelectedChallanIds((prev) => prev.filter((id) => id !== challan._id));
      }
    }
  };

  const updateRow = (index: number, field: keyof DeliveryNote, value: string | number) => {
    const updated = [...deliveryNotes];
    
    if (field === 'quantity') {
      const numValue = value === '' || value === null || value === undefined ? 0 : Number(value);
      updated[index] = { ...updated[index], [field]: numValue };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }

    onChange(updated);
  };

  const totalQuantity = deliveryNotes.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-4">
      <div>
        <SearchableMultiSelect
          options={challans.map((challan) => ({
            value: challan._id,
            label: challan.challanNumber,
            sublabel: `Date: ${challan.challanDate}, Units: ${challan.totalUnits}`,
          }))}
          selectedValues={selectedChallanIds}
          onChange={handleChallanSelection}
          label="Select Challans"
          placeholder="Search and select challans..."
          disabled={loadingChallans}
          required={false}
          emptyMessage="No challans available"
          maxHeight="max-h-60"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">Date (BS)</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Challan No</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Quantity</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Remarks</th>
              <th className="border border-gray-300 px-4 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {deliveryNotes.map((note, index) => (
              <tr key={index}>
                <td className="border border-gray-300 px-4 py-2">
                  <NepaliDatePicker
                    value={note.date}
                    onChange={(value) => updateRow(index, 'date', value)}
                    placeholder="YYYY-MM-DD"
                    className="w-full"
                  />
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <input
                    type="text"
                    value={note.challanNo}
                    onChange={(e) => updateRow(index, 'challanNo', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Challan number"
                  />
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <input
                    type="number"
                    value={note.quantity === 0 ? '' : note.quantity}
                    onChange={(e) => updateRow(index, 'quantity', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                    placeholder="0"
                  />
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <input
                    type="text"
                    value={note.remarks || ''}
                    onChange={(e) => updateRow(index, 'remarks', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter remarks..."
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
              <td colSpan={2} className="border border-gray-300 px-4 py-2 text-right font-medium">
                Total:
              </td>
              <td className="border border-gray-300 px-4 py-2 font-medium">
                {totalQuantity.toFixed(2)}
              </td>
              <td colSpan={2} className="border border-gray-300 px-4 py-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <button
        type="button"
        onClick={addRow}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
      >
        Add Custom Row
      </button>
    </div>
  );
}
