'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { EquipmentStatus } from '@/lib/types';
import toast from 'react-hot-toast';

export default function EditEquipmentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const equipmentId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    equipmentName: '',
    size: '',
    status: EquipmentStatus.OPERATIONAL,
    lastMaintainedDate: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && equipmentId) {
      fetchEquipment();
    }
  }, [user, equipmentId]);

  const fetchEquipment = async () => {
    try {
      const response = await fetch(`/api/equipment/${equipmentId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch equipment');
      }

      setFormData({
        equipmentName: data.equipment.equipmentName || '',
        size: data.equipment.size || '',
        status: data.equipment.status || EquipmentStatus.OPERATIONAL,
        lastMaintainedDate: data.equipment.lastMaintainedDate || '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch equipment');
      router.push('/dashboard/equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/equipment/${equipmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update equipment');
      }

      toast.success('Equipment updated successfully');
      router.push('/dashboard/equipment');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update equipment');
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
          <div className="text-lg">Loading equipment...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Equipment</h1>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Equipment Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.equipmentName}
                onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Size <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as EquipmentStatus })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.values(EquipmentStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Last Maintained Date (BS) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.lastMaintainedDate}
                onChange={(e) =>
                  setFormData({ ...formData, lastMaintainedDate: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="YYYY-MM-DD"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Update Equipment'}
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
