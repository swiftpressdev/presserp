'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatBSDate } from '@/lib/dateUtils';
import { Particular } from '@/components/ParticularsTable';

interface Estimate {
  _id: string;
  estimateNumber: string;
  estimateDate: string;
  clientId: string | { _id: string; clientName: string };
  jobId: string | { _id: string; jobNo: string; jobName: string };
  totalBWPages: number;
  totalColorPages: number;
  totalPages: number;
  paperSize: string;
  particulars: Particular[];
  total: number;
  hasDiscount?: boolean;
  discountPercentage?: number;
  discountAmount?: number;
  priceAfterDiscount?: number;
  vatType: 'excluded' | 'included' | 'none';
  vatAmount?: number;
  grandTotal: number;
  remarks?: string;
}

export default function ViewEstimatePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const estimateId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [estimate, setEstimate] = useState<Estimate | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && estimateId) {
      fetchEstimate();
    }
  }, [user, estimateId]);

  const fetchEstimate = async () => {
    try {
      const response = await fetch(`/api/estimates/${estimateId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch estimate');
      }

      const convertedParticulars: Particular[] = data.estimate.particulars.map((p: any) => ({
        sn: p.sn || 0,
        particulars: p.particulars || '',
        quantity: p.quantity || 0,
        rate: p.rate || 0,
        amount: p.amount || 0,
      }));

      setEstimate({
        ...data.estimate,
        particulars: convertedParticulars,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch estimate');
      router.push('/dashboard/estimates');
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
          <div className="text-lg">Loading estimate...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!estimate) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-red-600">Estimate not found</div>
        </div>
      </DashboardLayout>
    );
  }

  const clientName = typeof estimate.clientId === 'object' ? estimate.clientId.clientName : '-';
  const jobNumber = typeof estimate.jobId === 'object' ? estimate.jobId.jobNo : '-';
  const jobName = typeof estimate.jobId === 'object' ? estimate.jobId.jobName : '-';

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">View Estimate</h1>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/estimates/${estimateId}`}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Edit
            </Link>
            <Link
              href="/dashboard/estimates"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back
            </Link>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Estimate Number</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {estimate.estimateNumber}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Estimate Date</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {formatBSDate(estimate.estimateDate)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Client</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {clientName}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Job No</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {jobNumber}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Job Name</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {jobName}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Paper Size</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {estimate.paperSize}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Total Pages</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {estimate.totalPages} (BW: {estimate.totalBWPages}, Color: {estimate.totalColorPages})
              </div>
            </div>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {estimate.particulars
                    .filter((p) => p.particulars.trim() && p.quantity > 0 && p.rate > 0)
                    .map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.sn}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.particulars}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.rate.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Total:</span>
                  <span className="text-sm text-gray-900">{estimate.total.toFixed(2)}</span>
                </div>
                {estimate.hasDiscount && estimate.discountPercentage && estimate.discountPercentage > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Discount ({estimate.discountPercentage}%):
                      </span>
                      <span className="text-sm text-red-600">
                        -{estimate.discountAmount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Price After Discount:</span>
                      <span className="text-sm text-gray-900">
                        {estimate.priceAfterDiscount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </>
                )}
                {estimate.vatType !== 'none' && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      VAT (13% {estimate.vatType === 'included' ? 'Included' : 'Excluded'}):
                    </span>
                    <span className="text-sm text-gray-900">
                      {estimate.vatAmount?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-bold text-gray-900">Grand Total:</span>
                  <span className="text-sm font-bold text-gray-900">
                    {estimate.grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {estimate.remarks && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Remarks</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{estimate.remarks}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
