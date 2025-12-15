'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { generateQuotationPDF } from '@/lib/pdfUtils';
import ParticularsTable, { Particular } from '@/components/ParticularsTable';

interface Quotation {
  _id: string;
  quotationSN: string;
  partyName: string;
  address: string;
  phoneNumber: string;
  particulars: any[];
  total: number;
  hasVAT: boolean;
  subtotal?: number;
  vatAmount?: number;
  grandTotal: number;
}

export default function QuotationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    partyName: '',
    address: '',
    phoneNumber: '',
  });
  const [editParticulars, setEditParticulars] = useState<Particular[]>([]);
  const [editHasVAT, setEditHasVAT] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchQuotations();
    }
  }, [user]);

  const fetchQuotations = async () => {
    try {
      const response = await fetch('/api/quotations');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setQuotations(data.quotations);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch quotations');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = (quotation: Quotation) => {
    generateQuotationPDF(quotation);
    toast.success('PDF exported successfully');
  };

  const handleEdit = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    setEditFormData({
      partyName: quotation.partyName,
      address: quotation.address,
      phoneNumber: quotation.phoneNumber,
    });
    // Convert particulars to match Particular interface
    const convertedParticulars: Particular[] = quotation.particulars.map((p: any) => ({
      sn: p.sn || 0,
      particulars: p.particulars || '',
      quantity: p.quantity || 0,
      rate: p.rate || 0,
      amount: p.amount || 0,
    }));
    setEditParticulars(convertedParticulars.length > 0 ? convertedParticulars : [
      { sn: 1, particulars: '', quantity: 0, rate: 0, amount: 0 },
    ]);
    setEditHasVAT(quotation.hasVAT);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuotation) return;

    // Filter out empty rows
    const validParticulars = editParticulars.filter(
      (p) => p.particulars.trim() && p.quantity > 0 && p.rate > 0
    );

    if (validParticulars.length === 0) {
      toast.error('Please add at least one particular with all fields filled');
      return;
    }

    // Re-index the SN for valid particulars
    const indexedParticulars = validParticulars.map((p, index) => ({
      ...p,
      sn: index + 1,
      quantity: Number(p.quantity),
      rate: Number(p.rate),
      amount: Number(p.amount),
    }));

    try {
      const response = await fetch(`/api/quotations/${editingQuotation._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editFormData,
          particulars: indexedParticulars,
          hasVAT: editHasVAT,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update quotation');
      }

      toast.success('Quotation updated successfully');
      setShowEditModal(false);
      setEditingQuotation(null);
      fetchQuotations();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update quotation');
    }
  };

  const handleDelete = async (quotationId: string, quotationSN: string) => {
    if (!confirm(`Are you sure you want to delete quotation "${quotationSN}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/quotations/${quotationId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete quotation');
      }

      toast.success('Quotation deleted successfully');
      fetchQuotations();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete quotation');
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Quotations</h1>
          <Link
            href="/dashboard/quotations/create"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Create Quotation
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading quotations...</div>
        ) : quotations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">
              No quotations found. Create your first quotation.
            </p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quotation No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Party Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grand Total
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quotations.map((quotation) => (
                  <tr key={quotation._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {quotation.quotationSN}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {quotation.partyName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {quotation.phoneNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {quotation.grandTotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm space-x-2">
                      <button
                        onClick={() => handleEdit(quotation)}
                        className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleExportPDF(quotation)}
                        className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
                      >
                        Export PDF
                      </button>
                      <button
                        onClick={() => handleDelete(quotation._id, quotation.quotationSN)}
                        className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingQuotation && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-5xl shadow-lg rounded-md bg-white mb-10">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Quotation</h3>
                <form onSubmit={handleUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Party Name</label>
                      <input
                        type="text"
                        value={editFormData.partyName}
                        onChange={(e) => setEditFormData({ ...editFormData, partyName: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                      <input
                        type="tel"
                        value={editFormData.phoneNumber}
                        onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <input
                        type="text"
                        value={editFormData.address}
                        onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Particulars</h4>
                    <ParticularsTable
                      particulars={editParticulars}
                      onChange={setEditParticulars}
                      hasVAT={editHasVAT}
                      onVATChange={setEditHasVAT}
                    />
                  </div>

                  <div className="flex justify-end space-x-3 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingQuotation(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Update
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
