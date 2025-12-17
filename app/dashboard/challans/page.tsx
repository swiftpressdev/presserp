'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { generateChallanPDF } from '@/lib/pdfUtils';
import { formatBSDate } from '@/lib/dateUtils';
import ChallanParticularsTable, { ChallanParticular } from '@/components/ChallanParticularsTable';

interface Challan {
  _id: string;
  challanNumber: string;
  challanDate: string;
  destination: string;
  estimateReferenceNo: string;
  particulars: ChallanParticular[];
  totalUnits: number;
}

export default function ChallansPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [challans, setChallans] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingChallan, setEditingChallan] = useState<Challan | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    challanDate: '',
    destination: '',
    estimateReferenceNo: '',
  });
  const [editParticulars, setEditParticulars] = useState<ChallanParticular[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchChallans();
    }
  }, [user]);

  const fetchChallans = async () => {
    try {
      const response = await fetch('/api/challans');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setChallans(data.challans);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch challans');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (challan: Challan) => {
    setEditingChallan(challan);
    setEditFormData({
      challanDate: challan.challanDate,
      destination: challan.destination,
      estimateReferenceNo: challan.estimateReferenceNo,
    });
    setEditParticulars(challan.particulars);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChallan) return;

    const validParticulars = editParticulars.filter(
      (p) => p.particulars.trim() && p.quantity > 0
    );

    if (validParticulars.length === 0) {
      toast.error('Please add at least one particular with all fields filled');
      return;
    }

    const indexedParticulars = validParticulars.map((p, index) => ({
      ...p,
      sn: index + 1,
      quantity: Number(p.quantity),
    }));

    try {
      const response = await fetch(`/api/challans/${editingChallan._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editFormData,
          particulars: indexedParticulars,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update challan');
      }

      toast.success('Challan updated successfully');
      setShowEditModal(false);
      setEditingChallan(null);
      fetchChallans();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update challan');
    }
  };

  const handleExportPDF = (challan: Challan) => {
    generateChallanPDF({
      challanNumber: challan.challanNumber,
      challanDate: formatBSDate(challan.challanDate),
      destination: challan.destination,
      estimateReferenceNo: challan.estimateReferenceNo,
      particulars: challan.particulars,
      totalUnits: challan.totalUnits,
    });
    toast.success('PDF exported successfully');
  };

  const handleDelete = async (challanId: string, challanNumber: string) => {
    if (!confirm(`Are you sure you want to delete challan "${challanNumber}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/challans/${challanId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete challan');
      }

      toast.success('Challan deleted successfully');
      fetchChallans();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete challan');
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
          <h1 className="text-3xl font-bold text-gray-900">Challans</h1>
          <Link
            href="/dashboard/challans/create"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Create Challan
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading challans...</div>
        ) : challans.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No challans found. Create your first challan.</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estimate Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Units
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {challans.map((challan) => (
                  <tr key={challan._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {challan.challanNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatBSDate(challan.challanDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {challan.destination}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {challan.estimateReferenceNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {challan.totalUnits.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm space-x-2">
                      <button
                        onClick={() => handleEdit(challan)}
                        className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleExportPDF(challan)}
                        className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => handleDelete(challan._id, challan.challanNumber)}
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

        {showEditModal && editingChallan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Challan</h2>
                <form onSubmit={handleUpdate}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Challan Date (BS)</label>
                      <input
                        type="text"
                        required
                        value={editFormData.challanDate}
                        onChange={(e) => setEditFormData({ ...editFormData, challanDate: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="YYYY-MM-DD"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Destination</label>
                      <input
                        type="text"
                        required
                        value={editFormData.destination}
                        onChange={(e) => setEditFormData({ ...editFormData, destination: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Estimate Reference No</label>
                      <input
                        type="text"
                        required
                        value={editFormData.estimateReferenceNo}
                        onChange={(e) => setEditFormData({ ...editFormData, estimateReferenceNo: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Particulars</h4>
                    <ChallanParticularsTable
                      particulars={editParticulars}
                      onChange={setEditParticulars}
                    />
                  </div>

                  <div className="flex justify-end space-x-3 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingChallan(null);
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
