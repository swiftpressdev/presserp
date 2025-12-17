'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import ChallanParticularsTable, { ChallanParticular } from '@/components/ChallanParticularsTable';
import { getCurrentBSDate } from '@/lib/dateUtils';
import toast from 'react-hot-toast';

export default function CreateChallanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    challanDate: getCurrentBSDate(),
    destination: '',
    estimateReferenceNo: '',
  });
  const [particulars, setParticulars] = useState<ChallanParticular[]>([
    { sn: 1, particulars: '', quantity: 0 },
  ]);
  const [loadingParticulars, setLoadingParticulars] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleGetParticulars = async () => {
    if (!formData.estimateReferenceNo.trim()) {
      toast.error('Please enter an estimate reference number');
      return;
    }

    setLoadingParticulars(true);
    try {
      const response = await fetch('/api/estimates/by-number', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estimateNumber: formData.estimateReferenceNo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch estimate particulars');
      }

      if (data.estimate && data.estimate.particulars) {
        setParticulars(data.estimate.particulars);
        toast.success('Particulars loaded successfully');
      } else {
        toast.error('No particulars found for this estimate');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch estimate particulars');
    } finally {
      setLoadingParticulars(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validParticulars = particulars.filter(
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

    setLoading(true);

    try {
      const response = await fetch('/api/challans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          particulars: indexedParticulars,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create challan');
      }

      toast.success('Challan created successfully');
      router.push('/dashboard/challans');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create challan');
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

  const totalUnits = particulars.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Challan</h1>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Challan Date (BS) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.challanDate}
                onChange={(e) => setFormData({ ...formData, challanDate: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="YYYY-MM-DD"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Destination <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Estimate Reference No <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={formData.estimateReferenceNo}
                  onChange={(e) => setFormData({ ...formData, estimateReferenceNo: e.target.value })}
                  className="mt-1 flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter estimate number"
                />
                <button
                  type="button"
                  onClick={handleGetParticulars}
                  disabled={loadingParticulars}
                  className="mt-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loadingParticulars ? 'Loading...' : 'Get Particulars Detail'}
                </button>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Particulars</h2>
            <ChallanParticularsTable
              particulars={particulars}
              onChange={setParticulars}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-gray-900">
              Total Units: <span className="text-blue-600">{totalUnits.toFixed(2)}</span>
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Challan'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
