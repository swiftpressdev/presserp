'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import toast from 'react-hot-toast';

interface Client {
  _id: string;
  clientName: string;
}

export default function CreateChallanReportPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    reportName: '',
    filterType: 'client' as 'client' | 'particular',
    clientId: '',
    particularName: '',
    finalOrder: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch clients');
      }

      setClients(data.clients || []);
    } catch (error: any) {
      console.error('Failed to fetch clients:', error);
      toast.error(error.message || 'Failed to load clients');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.filterType === 'client' && !formData.clientId) {
      toast.error('Please select a client');
      return;
    }

    if (formData.filterType === 'particular' && !formData.particularName.trim()) {
      toast.error('Please enter a particular name');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/challan-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportName: formData.reportName,
          filterType: formData.filterType,
          clientId: formData.filterType === 'client' ? formData.clientId : undefined,
          particularName: formData.filterType === 'particular' ? formData.particularName : undefined,
          finalOrder: formData.finalOrder || 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create report');
      }

      toast.success('Report created successfully');
      router.push('/dashboard/challan-reports');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create report');
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

  return (
    <DashboardLayout>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Challan Report</h1>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Report Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.reportName}
              onChange={(e) => setFormData({ ...formData, reportName: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter report name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="filterType"
                  value="client"
                  checked={formData.filterType === 'client'}
                  onChange={(e) => setFormData({ ...formData, filterType: e.target.value as 'client' })}
                />
                <span>Client</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="filterType"
                  value="particular"
                  checked={formData.filterType === 'particular'}
                  onChange={(e) => setFormData({ ...formData, filterType: e.target.value as 'particular' })}
                />
                <span>Particular Name</span>
              </label>
            </div>
          </div>

          {formData.filterType === 'client' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Client <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.clientName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.filterType === 'particular' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Particular Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.particularName}
                onChange={(e) => setFormData({ ...formData, particularName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter particular name to search"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Final Order
            </label>
            <input
              type="number"
              value={formData.finalOrder}
              onChange={(e) => setFormData({ ...formData, finalOrder: Number(e.target.value) })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              min="0"
              placeholder="0"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Report'}
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
