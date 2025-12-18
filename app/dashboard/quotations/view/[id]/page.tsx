'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Particular } from '@/components/ParticularsTable';

interface Quotation {
  _id: string;
  quotationSN: string;
  partyName: string;
  address: string;
  phoneNumber: string;
  particulars: Particular[];
  total: number;
  hasVAT: boolean;
  subtotal?: number;
  vatAmount?: number;
  grandTotal: number;
}

export default function ViewQuotationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const quotationId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<Quotation | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && quotationId) {
      fetchQuotation();
    }
  }, [user, quotationId]);

  const fetchQuotation = async () => {
    try {
      const response = await fetch(`/api/quotations/${quotationId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch quotation');
      }

      const convertedParticulars: Particular[] = data.quotation.particulars.map((p: any) => ({
        sn: p.sn || 0,
        particulars: p.particulars || '',
        quantity: p.quantity || 0,
        rate: p.rate || 0,
        amount: p.amount || 0,
      }));

      setQuotation({
        ...data.quotation,
        particulars: convertedParticulars,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch quotation');
      router.push('/dashboard/quotations');
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
          <div className="text-lg">Loading quotation...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!quotation) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-red-600">Quotation not found</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">View Quotation</h1>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/quotations/${quotationId}`}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Edit
            </Link>
            <Link
              href="/dashboard/quotations"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back
            </Link>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Quotation No</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {quotation.quotationSN}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Party Name</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {quotation.partyName}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {quotation.address}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {quotation.phoneNumber}
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
                  {quotation.particulars
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
                  <span className="text-sm text-gray-900">{quotation.total.toFixed(2)}</span>
                </div>
                {quotation.hasVAT && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                      <span className="text-sm text-gray-900">
                        {quotation.subtotal?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">VAT (13%):</span>
                      <span className="text-sm text-gray-900">
                        {quotation.vatAmount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-bold text-gray-900">Grand Total:</span>
                  <span className="text-sm font-bold text-gray-900">
                    {quotation.grandTotal.toFixed(2)}
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
