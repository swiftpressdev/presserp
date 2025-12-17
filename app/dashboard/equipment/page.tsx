'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatBSDate } from '@/lib/dateUtils';
import { EquipmentStatus } from '@/lib/types';

interface Equipment {
  _id: string;
  equipmentName: string;
  size: string;
  status: string;
  lastMaintainedDate: string;
}

export default function EquipmentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchEquipment();
    }
  }, [user]);

  const fetchEquipment = async () => {
    try {
      const response = await fetch('/api/equipment');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setEquipment(data.equipment);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Equipment) => {
    router.push(`/dashboard/equipment/${item._id}`);
  };

  const handleDelete = async (equipmentId: string, equipmentName: string) => {
    if (!confirm(`Are you sure you want to delete "${equipmentName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/equipment/${equipmentId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete equipment');
      }

      toast.success('Equipment deleted successfully');
      fetchEquipment();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete equipment');
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
          <h1 className="text-3xl font-bold text-gray-900">Equipment</h1>
          <Link
            href="/dashboard/equipment/create"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Add Equipment
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading equipment...</div>
        ) : equipment.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No equipment found. Create your first equipment.</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipment Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Maintained
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {equipment.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.equipmentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.status}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatBSDate(item.lastMaintainedDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Link
                        href={`/dashboard/equipment/${item._id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(item._id, item.equipmentName)}
                        className="text-red-600 hover:text-red-900 ml-4"
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
