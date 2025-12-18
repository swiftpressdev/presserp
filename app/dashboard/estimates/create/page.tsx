'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import ParticularsTable, { Particular } from '@/components/ParticularsTable';
import { getCurrentBSDate } from '@/lib/dateUtils';
import toast from 'react-hot-toast';

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

export default function CreateEstimatePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);

  const [formData, setFormData] = useState({
    clientId: '',
    jobId: '',
    estimateDate: getCurrentBSDate(),
  });

  const [jobDetails, setJobDetails] = useState({
    totalBWPages: 0,
    totalColorPages: 0,
    totalPages: 0,
    paperSize: '',
  });

  const [particulars, setParticulars] = useState<Particular[]>([
    { sn: 1, particulars: '', quantity: 0, rate: 0, amount: 0 },
  ]);
  const [hasVAT, setHasVAT] = useState(false);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState(0);

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

  const handleClientChange = (clientId: string) => {
    setFormData({ ...formData, clientId, jobId: '' });
    setJobDetails({ totalBWPages: 0, totalColorPages: 0, totalPages: 0, paperSize: '' });

    const filtered = allJobs.filter((job) => {
      // Handle both populated object and string ID
      const jobClientId = typeof job.clientId === 'object' ? job.clientId._id.toString() : job.clientId.toString();
      return jobClientId === clientId;
    });
    setFilteredJobs(filtered);
  };

  const handleJobChange = (jobId: string) => {
    setFormData({ ...formData, jobId });

    const selectedJob = allJobs.find((job) => job._id === jobId);
    if (selectedJob) {
      setJobDetails({
        totalBWPages: selectedJob.totalBWPages,
        totalColorPages: selectedJob.totalColorPages,
        totalPages: selectedJob.totalPages,
        paperSize: selectedJob.paperSize,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Filter out empty rows
    const validParticulars = particulars.filter(
      (p) => p.particulars.trim() && p.quantity > 0 && p.rate > 0
    );

    if (validParticulars.length === 0) {
      toast.error('Please add at least one particular with all fields filled');
      return;
    }

    // Re-index the SN for valid particulars
    const indexedParticulars = validParticulars.map((p, index) => ({
      ...p,
      sn: index + 1,
      quantity: Number(p.quantity),
      rate: Number(p.rate),
      amount: Number(p.amount),
    }));

    setLoading(true);

    try {
      const response = await fetch('/api/estimates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          particulars: indexedParticulars,
          hasVAT,
          hasDiscount,
          discountPercentage: hasDiscount ? discountPercentage : 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create estimate');
      }

      toast.success('Estimate created successfully');
      router.push('/dashboard/estimates');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create estimate');
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
      <div className="max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Estimate</h1>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Client <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Client</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.clientName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Job Number <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.jobId}
                onChange={(e) => handleJobChange(e.target.value)}
                disabled={!formData.clientId}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select Job</option>
                {filteredJobs.map((job) => (
                  <option key={job._id} value={job._id}>
                    {job.jobNo} - {job.jobName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Job Name</label>
              <input
                type="text"
                disabled
                value={formData.jobId ? (allJobs.find(j => j._id === formData.jobId)?.jobName || '') : ''}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Estimate Date (BS) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.estimateDate}
                onChange={(e) => setFormData({ ...formData, estimateDate: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="YYYY-MM-DD"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Paper Size</label>
              <input
                type="text"
                disabled
                value={jobDetails.paperSize}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Total B/W Pages</label>
              <input
                type="text"
                disabled
                value={jobDetails.totalBWPages}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Total Color Pages</label>
              <input
                type="text"
                disabled
                value={jobDetails.totalColorPages}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Total Pages</label>
              <input
                type="text"
                disabled
                value={jobDetails.totalPages}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
              />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Particulars</h2>
            <ParticularsTable
              particulars={particulars}
              onChange={setParticulars}
              hasVAT={hasVAT}
              onVATChange={setHasVAT}
              hasDiscount={hasDiscount}
              onDiscountChange={setHasDiscount}
              discountPercentage={discountPercentage}
              onDiscountPercentageChange={setDiscountPercentage}
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Estimate'}
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
