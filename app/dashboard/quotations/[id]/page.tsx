'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import ParticularsTable, { Particular } from '@/components/ParticularsTable';
import toast from 'react-hot-toast';

export default function EditQuotationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const quotationId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    partyName: '',
    address: '',
    phoneNumber: '',
    remarks: '',
  });
  const [particulars, setParticulars] = useState<Particular[]>([
    { sn: 1, particulars: '', quantity: 0, rate: 0, amount: 0 },
  ]);
  const [vatType, setVatType] = useState<'excluded' | 'included' | 'none'>('none');
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState(0);

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

      setFormData({
        partyName: data.quotation.partyName || '',
        address: data.quotation.address || '',
        phoneNumber: data.quotation.phoneNumber || '',
        remarks: data.quotation.remarks || '',
      });

      const convertedParticulars: Particular[] = data.quotation.particulars.map((p: any) => ({
        sn: p.sn || 0,
        particulars: p.particulars || '',
        quantity: p.quantity || 0,
        rate: p.rate || 0,
        amount: p.amount || 0,
      }));

      setParticulars(convertedParticulars.length > 0 ? convertedParticulars : [
        { sn: 1, particulars: '', quantity: 0, rate: 0, amount: 0 },
      ]);
      setVatType(data.quotation.vatType || 'none');
      setHasDiscount(data.quotation.hasDiscount || false);
      setDiscountPercentage(data.quotation.discountPercentage || 0);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch quotation');
      router.push('/dashboard/quotations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validParticulars = particulars.filter(
      (p) => p.particulars.trim() && p.quantity > 0 && p.rate > 0
    );

    if (validParticulars.length === 0) {
      toast.error('Please add at least one particular with all fields filled');
      return;
    }

    const indexedParticulars = validParticulars.map((p, index) => ({
      ...p,
      sn: index + 1,
      quantity: Number(p.quantity),
      rate: Number(p.rate),
      amount: Number(p.amount),
    }));

    setSaving(true);

    try {
      const response = await fetch(`/api/quotations/${quotationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          particulars: indexedParticulars,
          vatType,
          hasDiscount,
          discountPercentage: hasDiscount ? discountPercentage : 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update quotation');
      }

      toast.success('Quotation updated successfully');
      router.push('/dashboard/quotations');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update quotation');
    } finally {
      setSaving(false);
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

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Quotation</h1>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Party Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.partyName}
                onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Particulars</h2>
            <ParticularsTable
              particulars={particulars}
              onChange={setParticulars}
              vatType={vatType}
              onVATTypeChange={setVatType}
              hasDiscount={hasDiscount}
              onDiscountChange={setHasDiscount}
              discountPercentage={discountPercentage}
              onDiscountPercentageChange={setDiscountPercentage}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remarks
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter any additional remarks or notes..."
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Update Quotation'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
