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
  particulars: ChallanParticular[];
  totalUnits: number;
}

export default function ChallansPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [challans, setChallans] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);

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
    router.push(`/dashboard/challans/${challan._id}`);
  };

  const handleExportPDF = async (challan: Challan) => {
    try {
      await generateChallanPDF({
        challanNumber: challan.challanNumber,
        challanDate: formatBSDate(challan.challanDate),
        destination: challan.destination,
        particulars: challan.particulars,
        totalUnits: challan.totalUnits,
      });
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
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
                      {challan.totalUnits.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm space-x-2">
                      <Link
                        href={`/dashboard/challans/view/${challan._id}`}
                        className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
                      >
                        View
                      </Link>
                      <Link
                        href={`/dashboard/challans/${challan._id}`}
                        className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                      >
                        Edit
                      </Link>
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
      </div>
    </DashboardLayout>
  );
}
