'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import ChallanParticularsTable, { ChallanParticular } from '@/components/ChallanParticularsTable';
import SearchableMultiSelect from '@/components/SearchableMultiSelect';
import { getCurrentBSDate } from '@/lib/dateUtils';
import toast from 'react-hot-toast';

interface Client {
  _id: string;
  clientName: string;
  address?: string;
}

interface Job {
  _id: string;
  jobNo: string;
  jobName: string;
  clientId: string | { _id: string; clientName: string };
}

export default function CreateChallanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [formData, setFormData] = useState({
    challanDate: getCurrentBSDate(),
    clientId: '',
    jobId: '',
    destination: '',
    remarks: '',
  });
  const [particulars, setParticulars] = useState<ChallanParticular[]>([
    { sn: 1, particulars: '', quantity: 0 },
  ]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchDropdownData();
    }
  }, [user]);

  const fetchDropdownData = async () => {
    try {
      const [clientsRes, jobsRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/jobs'),
      ]);

      const [clientsData, jobsData] = await Promise.all([
        clientsRes.json(),
        jobsRes.json(),
      ]);

      if (!clientsRes.ok) {
        throw new Error(clientsData.error || 'Failed to fetch clients');
      }

      if (!jobsRes.ok) {
        throw new Error(jobsData.error || 'Failed to fetch jobs');
      }

      setClients(clientsData.clients || []);
      setAllJobs(jobsData.jobs || []);
    } catch (error: any) {
      console.error('Failed to fetch dropdown data:', error);
      toast.error(error.message || 'Failed to load data');
    }
  };

  const handleClientChange = (selectedClientIds: string[]) => {
    const clientId = selectedClientIds.length > 0 ? selectedClientIds[0] : '';
    const selectedClient = clients.find((c) => c._id === clientId);
    
    setFormData({
      ...formData,
      clientId,
      jobId: '', // Reset job when client changes
      destination: selectedClient?.address || '',
    });

    // Filter jobs by selected client
    if (clientId) {
      const filtered = allJobs.filter((job) => {
        const jobClientId = typeof job.clientId === 'object' ? job.clientId._id.toString() : job.clientId.toString();
        return jobClientId === clientId;
      });
      setFilteredJobs(filtered);
    } else {
      setFilteredJobs([]);
    }
  };

  const handleJobChange = (selectedJobIds: string[]) => {
    const jobId = selectedJobIds.length > 0 ? selectedJobIds[0] : '';
    setFormData({ ...formData, jobId });
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
          challanDate: formData.challanDate,
          clientId: formData.clientId || undefined,
          jobId: formData.jobId || undefined,
          destination: formData.destination,
          remarks: formData.remarks || undefined,
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
              />
            </div>

            <div>
              <SearchableMultiSelect
                options={filteredJobs.map((job) => ({
                  value: job._id,
                  label: job.jobNo,
                  sublabel: job.jobName,
                }))}
                selectedValues={formData.jobId ? [formData.jobId] : []}
                onChange={handleJobChange}
                label="Job Number"
                placeholder="Search job..."
                emptyMessage={formData.clientId ? 'No jobs available for this client' : 'Please select a client first'}
                disabled={!formData.clientId}
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
                placeholder="Auto-filled from client address"
              />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Particulars</h2>
            <ChallanParticularsTable
              particulars={particulars}
              onChange={setParticulars}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Remarks
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Enter remarks (optional)"
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
