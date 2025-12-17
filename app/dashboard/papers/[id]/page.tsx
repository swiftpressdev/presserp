'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { PaperType } from '@/lib/types';
import toast from 'react-hot-toast';

export default function EditPaperPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const paperId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    paperName: '',
    paperType: PaperType.REAM,
    paperTypeOther: '',
    paperSize: '',
    paperWeight: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && paperId) {
      fetchPaper();
    }
  }, [user, paperId]);

  const fetchPaper = async () => {
    try {
      const response = await fetch(`/api/papers/${paperId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch paper');
      }

      setFormData({
        paperName: data.paper.paperName || '',
        paperType: data.paper.paperType || PaperType.REAM,
        paperTypeOther: data.paper.paperTypeOther || '',
        paperSize: data.paper.paperSize || '',
        paperWeight: data.paper.paperWeight || '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch paper');
      router.push('/dashboard/papers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/papers/${paperId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paperName: formData.paperName,
          paperType: formData.paperType,
          paperTypeOther: formData.paperType === PaperType.OTHERS ? formData.paperTypeOther : undefined,
          paperSize: formData.paperSize,
          paperWeight: formData.paperWeight,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update paper');
      }

      toast.success('Paper updated successfully');
      router.push('/dashboard/papers');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update paper');
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
          <div className="text-lg">Loading paper...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Paper</h1>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Paper Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.paperName}
                onChange={(e) => setFormData({ ...formData, paperName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Paper Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.paperType}
                onChange={(e) =>
                  setFormData({ ...formData, paperType: e.target.value as PaperType, paperTypeOther: '' })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.values(PaperType).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {formData.paperType === PaperType.OTHERS && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Specify Other Type <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.paperTypeOther}
                  onChange={(e) =>
                    setFormData({ ...formData, paperTypeOther: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Paper Size <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.paperSize}
                onChange={(e) => setFormData({ ...formData, paperSize: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., A4, Letter"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Paper Weight <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.paperWeight}
                onChange={(e) => setFormData({ ...formData, paperWeight: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 80gsm"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Update Paper'}
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
