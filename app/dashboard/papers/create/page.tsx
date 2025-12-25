'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import SearchableMultiSelect from '@/components/SearchableMultiSelect';
import { PaperType, PaperUnit } from '@/lib/types';
import toast from 'react-hot-toast';

interface Client {
  _id: string;
  clientName: string;
}

export default function CreatePaperPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    clientId: '',
    paperType: PaperType.MAP_LITHO,
    paperTypeOther: '',
    paperSize: '',
    paperWeight: '',
    units: PaperUnit.REAM,
    originalStock: 0,
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
      setClients(data.clients || []);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      toast.error('Failed to load clients');
    }
  };

  const handleClientChange = (selectedClientIds: string[]) => {
    setFormData({ ...formData, clientId: selectedClientIds[0] || '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Get clientName from selected clientId
    const selectedClient = clients.find((c) => c._id === formData.clientId);
    if (!selectedClient) {
      toast.error('Please select a client');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/papers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientName: selectedClient.clientName,
          paperType: formData.paperType,
          paperTypeOther: formData.paperTypeOther || undefined,
          paperSize: formData.paperSize,
          paperWeight: formData.paperWeight,
          units: formData.units,
          originalStock: formData.originalStock,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create paper');
      }

      toast.success('Paper created successfully');
      router.push('/dashboard/papers');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create paper');
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Paper</h1>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <SearchableMultiSelect
                options={clients.map((client) => ({
                  value: client._id,
                  label: client.clientName,
                }))}
                selectedValues={formData.clientId ? [formData.clientId] : []}
                onChange={handleClientChange}
                label="Client Name"
                placeholder="Search client..."
                required
                emptyMessage="No clients available"
                maxSelection={1}
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
                  setFormData({ ...formData, paperType: e.target.value as PaperType })
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

            {formData.paperType === PaperType.OTHER && (
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

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Units <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.units}
                onChange={(e) =>
                  setFormData({ ...formData, units: e.target.value as PaperUnit })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.values(PaperUnit).map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Original Stock
              </label>
              <input
                type="number"
                min="0"
                value={formData.originalStock}
                onChange={(e) => setFormData({ ...formData, originalStock: Number(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Paper'}
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
