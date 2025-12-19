'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { generateEstimatePDF } from '@/lib/pdfUtils';
import { formatBSDate } from '@/lib/dateUtils';
import ParticularsTable, { Particular } from '@/components/ParticularsTable';

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
  finishSize?: string;
  particulars: any[];
  total: number;
  hasDiscount?: boolean;
  discountPercentage?: number;
  discountAmount?: number;
  priceAfterDiscount?: number;
  vatType: 'excluded' | 'included' | 'none';
  vatAmount?: number;
  grandTotal: number;
  amountInWords?: string;
  remarks?: string;
}

interface Client {
  _id: string;
  clientName: string;
}

interface Job {
  _id: string;
  jobNo: string;
  jobName: string;
  clientId: string | { _id: string; clientName: string };
  totalBWPages: number;
  totalColorPages: number;
  totalPages: number;
  paperSize: string;
}

export default function EstimatesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchEstimates();
    }
  }, [user]);

  const fetchEstimates = async () => {
    try {
      const response = await fetch('/api/estimates');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setEstimates(data.estimates);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch estimates');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (estimate: Estimate) => {
    router.push(`/dashboard/estimates/${estimate._id}`);
  };

  const handleExportPDF = async (estimate: Estimate) => {
    try {
      const clientName = typeof estimate.clientId === 'object' ? estimate.clientId.clientName : '-';
      const jobNumber = typeof estimate.jobId === 'object' ? estimate.jobId.jobNo : '-';
      
      await generateEstimatePDF({
        estimateNumber: estimate.estimateNumber,
        estimateDate: formatBSDate(estimate.estimateDate),
        clientName,
        jobNumber,
        totalBWPages: estimate.totalBWPages,
        totalColorPages: estimate.totalColorPages,
        totalPages: estimate.totalPages,
        paperSize: estimate.paperSize,
        finishSize: estimate.finishSize,
        particulars: estimate.particulars,
        total: estimate.total,
        hasDiscount: estimate.hasDiscount,
        discountPercentage: estimate.discountPercentage,
        discountAmount: estimate.discountAmount,
        priceAfterDiscount: estimate.priceAfterDiscount,
        vatType: estimate.vatType,
        vatAmount: estimate.vatAmount,
        grandTotal: estimate.grandTotal,
        amountInWords: estimate.amountInWords,
        remarks: estimate.remarks,
      });
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  const handleDelete = async (estimateId: string, estimateNumber: string) => {
    if (!confirm(`Are you sure you want to delete estimate "${estimateNumber}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/estimates/${estimateId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete estimate');
      }

      toast.success('Estimate deleted successfully');
      fetchEstimates();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete estimate');
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
          <h1 className="text-3xl font-bold text-gray-900">Estimates</h1>
          <Link
            href="/dashboard/estimates/create"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Create Estimate
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading estimates...</div>
        ) : estimates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No estimates found. Create your first estimate.</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estimate No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Name
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
                {estimates.map((estimate) => (
                  <tr key={estimate._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {estimate.estimateNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatBSDate(estimate.estimateDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {typeof estimate.clientId === 'object' ? estimate.clientId.clientName : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {typeof estimate.jobId === 'object' ? estimate.jobId.jobNo : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {typeof estimate.jobId === 'object' ? estimate.jobId.jobName : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {estimate.grandTotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm space-x-2">
                      <Link
                        href={`/dashboard/estimates/view/${estimate._id}`}
                        className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
                      >
                        View
                      </Link>
                      <Link
                        href={`/dashboard/estimates/${estimate._id}`}
                        className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleExportPDF(estimate)}
                        className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
                      >
                        Export PDF
                      </button>
                      <button
                        onClick={() => handleDelete(estimate._id, estimate.estimateNumber)}
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
