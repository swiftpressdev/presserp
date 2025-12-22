'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatBSDate } from '@/lib/dateUtils';
import { ChallanParticular } from '@/components/ChallanParticularsTable';

interface Challan {
  _id: string;
  challanNumber: string;
  challanDate: string;
  clientId?: { _id: string; clientName: string } | string;
  jobId?: { _id: string; jobNo: string; jobName: string } | string;
  destination: string;
  remarks?: string;
  particulars: ChallanParticular[];
  totalUnits: number;
}

export default function ViewChallanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const challanId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [challan, setChallan] = useState<Challan | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && challanId) {
      fetchChallan();
    }
  }, [user, challanId]);

  const fetchChallan = async () => {
    try {
      const response = await fetch(`/api/challans/${challanId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch challan');
      }

      const convertedParticulars: ChallanParticular[] = data.challan.particulars.map((p: any) => ({
        sn: p.sn || 0,
        particulars: p.particulars || '',
        quantity: p.quantity || 0,
      }));

      setChallan({
        ...data.challan,
        particulars: convertedParticulars,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch challan');
      router.push('/dashboard/challans');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">Loading challan...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!challan) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-red-600">Challan not found</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">View Challan</h1>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/challans/${challanId}`}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Edit
            </Link>
            <Link
              href="/dashboard/challans"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back
            </Link>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Challan Number</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {challan.challanNumber}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Challan Date</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {formatBSDate(challan.challanDate)}
              </div>
            </div>

            {challan.clientId && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Client Name</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {typeof challan.clientId === 'object' ? challan.clientId.clientName : 'N/A'}
                </div>
              </div>
            )}

            {challan.jobId && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Job Number</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {typeof challan.jobId === 'object' ? `${challan.jobId.jobNo} - ${challan.jobId.jobName}` : 'N/A'}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Destination</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {challan.destination}
              </div>
            </div>

            {challan.remarks && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Remarks</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {challan.remarks}
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Particulars</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SN
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Particulars
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {challan.particulars
                    .filter((p) => p.particulars.trim() && p.quantity > 0)
                    .map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.sn}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.particulars}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.quantity.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between">
                  <span className="text-sm font-bold text-gray-900">Total Units:</span>
                  <span className="text-sm font-bold text-gray-900">
                    {challan.totalUnits.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
