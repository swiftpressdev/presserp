'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import ParticularsTable, { Particular } from '@/components/ParticularsTable';
import DeliveryNotesTable, { DeliveryNote } from '@/components/DeliveryNotesTable';
import SearchableMultiSelect from '@/components/SearchableMultiSelect';
import NepaliDatePicker from '@/components/NepaliDatePicker';
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
  bookSize?: string;
  bookSizeOther?: string;
}

export default function EditEstimatePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const estimateId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);

  const [formData, setFormData] = useState({
    clientId: '',
    jobIds: [] as string[],
    estimateDate: '',
    remarks: '',
  });

  const [jobDetails, setJobDetails] = useState({
    totalBWPages: 0,
    totalColorPages: 0,
    totalPages: 0,
    paperSize: '',
    finishSize: '',
  });

  const [particulars, setParticulars] = useState<Particular[]>([
    { sn: 1, particulars: '', quantity: 0, rate: 0, amount: 0 },
  ]);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [vatType, setVatType] = useState<'excluded' | 'included' | 'none'>('none');
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [loadingDefaults, setLoadingDefaults] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && estimateId) {
      const loadData = async () => {
        const jobsData = await fetchDropdownData();
        await fetchEstimate(jobsData);
      };
      loadData();
    }
  }, [user, estimateId]);

  // Filter jobs when client or allJobs changes
  useEffect(() => {
    if (formData.clientId && allJobs.length > 0) {
      const filtered = allJobs.filter((job) => {
        const jobClientId = typeof job.clientId === 'object' ? job.clientId._id.toString() : job.clientId.toString();
        return jobClientId === formData.clientId;
      });
      setFilteredJobs(filtered);

      // Update job details if jobs are selected
      if (formData.jobIds.length > 0) {
        updateJobDetails(formData.jobIds);
      }
    }
  }, [formData.clientId, formData.jobIds, allJobs]);

  const fetchDropdownData = async (): Promise<Job[]> => {
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

      const jobs = jobsData.jobs || [];
      setClients(clientsData.clients || []);
      setAllJobs(jobs);
      return jobs;
    } catch (error: any) {
      console.error('Failed to fetch dropdown data:', error);
      toast.error(error.message || 'Failed to load data');
      return [];
    }
  };

  const fetchEstimate = async (jobs: Job[]) => {
    try {
      const response = await fetch(`/api/estimates/${estimateId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch estimate');
      }

      const estimate = data.estimate;
      const clientId = typeof estimate.clientId === 'object' ? estimate.clientId._id.toString() : estimate.clientId.toString();
      
      // Handle jobId as array or single value (for backward compatibility)
      const jobIds = Array.isArray(estimate.jobId) 
        ? estimate.jobId.map((j: any) => typeof j === 'object' ? j._id.toString() : j.toString())
        : [typeof estimate.jobId === 'object' ? estimate.jobId._id.toString() : estimate.jobId.toString()];

      setFormData({
        clientId,
        jobIds,
        estimateDate: estimate.estimateDate || '',
        remarks: estimate.remarks || '',
      });

      // Set job details from estimate (will be updated by useEffect if job found in jobs list)
      setJobDetails({
        totalBWPages: estimate.totalBWPages || 0,
        totalColorPages: estimate.totalColorPages || 0,
        totalPages: estimate.totalPages || 0,
        paperSize: estimate.paperSize || '',
        finishSize: estimate.finishSize || '',
      });

      // Convert particulars to match Particular interface
      const convertedParticulars: Particular[] = estimate.particulars.map((p: any) => ({
        sn: p.sn || 0,
        particulars: p.particulars || '',
        quantity: p.quantity || 0,
        rate: p.rate || 0,
        amount: p.amount || 0,
      }));

      setParticulars(convertedParticulars.length > 0 ? convertedParticulars : [
        { sn: 1, particulars: '', quantity: 0, rate: 0, amount: 0 },
      ]);
      
      // Convert deliveryNotes to match DeliveryNote interface
      const convertedDeliveryNotes: DeliveryNote[] = estimate.deliveryNotes?.map((dn: any) => ({
        date: dn.date || '',
        challanNo: dn.challanNo || '',
        quantity: dn.quantity || 0,
        remarks: dn.remarks || '',
      })) || [];
      setDeliveryNotes(convertedDeliveryNotes);
      
      setVatType(estimate.vatType || 'none');
      setHasDiscount(estimate.hasDiscount || false);
      setDiscountPercentage(estimate.discountPercentage || 0);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch estimate');
      router.push('/dashboard/estimates');
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = (clientId: string) => {
    setFormData({ ...formData, clientId, jobIds: [] });
    setJobDetails({ totalBWPages: 0, totalColorPages: 0, totalPages: 0, paperSize: '', finishSize: '' });

    const filtered = allJobs.filter((job) => {
      const jobClientId = typeof job.clientId === 'object' ? job.clientId._id.toString() : job.clientId.toString();
      return jobClientId === clientId;
    });
    setFilteredJobs(filtered);
  };

  const updateJobDetails = (jobIds: string[]) => {
    // Sum up pages from all selected jobs
    const selectedJobs = allJobs.filter((job) => jobIds.includes(job._id));
    
    if (selectedJobs.length > 0) {
      const totalBWPages = selectedJobs.reduce((sum, job) => sum + (job.totalBWPages || 0), 0);
      const totalColorPages = selectedJobs.reduce((sum, job) => sum + (job.totalColorPages || 0), 0);
      const totalPages = selectedJobs.reduce((sum, job) => sum + (job.totalPages || 0), 0);
      
      // Get paperSize from first job (assuming all jobs have same paper size)
      const paperSize = selectedJobs[0]?.paperSize || '';
      
      // Get finishSize from first job
      const firstJob = selectedJobs[0];
      const finishSize = firstJob?.bookSize === 'Other' && firstJob?.bookSizeOther 
        ? firstJob.bookSizeOther 
        : firstJob?.bookSize || '';
      
      setJobDetails({
        totalBWPages,
        totalColorPages,
        totalPages,
        paperSize,
        finishSize,
      });
    } else {
      setJobDetails({ totalBWPages: 0, totalColorPages: 0, totalPages: 0, paperSize: '', finishSize: '' });
    }
  };

  const handleLoadDefaultParticulars = async () => {
    setLoadingDefaults(true);
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch default particulars');
      }

      const defaultParticulars = data.settings?.defaultParticulars || [];

      if (defaultParticulars.length === 0) {
        toast.error('No default particulars found in settings. Please add them in Settings page first.');
        return;
      }

      // Convert default particulars to Particular format
      const newParticulars: Particular[] = defaultParticulars.map((dp: any, index: number) => ({
        sn: particulars.length + index + 1,
        particulars: `${dp.particularName}${dp.unit ? ` (${dp.unit})` : ''}`,
        quantity: dp.quantity || 0,
        rate: dp.rate || 0,
        amount: Number(((dp.quantity || 0) * (dp.rate || 0)).toFixed(2)),
      }));

      // Add to existing particulars (append, don't replace)
      setParticulars([...particulars, ...newParticulars]);
      toast.success(`Loaded ${newParticulars.length} default particular(s)`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load default particulars');
    } finally {
      setLoadingDefaults(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate job selection
    if (formData.jobIds.length === 0) {
      toast.error('Please select at least one job');
      return;
    }

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

    setSaving(true);

    try {
      const response = await fetch(`/api/estimates/${estimateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          jobId: formData.jobIds, // Send as array
          particulars: indexedParticulars,
          deliveryNotes: deliveryNotes.filter((note) => note.challanNo && note.quantity > 0),
          vatType,
          hasDiscount,
          discountPercentage: hasDiscount ? discountPercentage : 0,
          finishSize: jobDetails.finishSize,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update estimate');
      }

      toast.success('Estimate updated successfully');
      router.push('/dashboard/estimates');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update estimate');
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
          <div className="text-lg">Loading estimate...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Estimate</h1>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <SearchableMultiSelect
                options={clients.map((client) => ({
                  value: client._id,
                  label: client.clientName,
                }))}
                selectedValues={formData.clientId ? [formData.clientId] : []}
                onChange={(selectedClientIds) => {
                  handleClientChange(selectedClientIds[0] || '');
                }}
                label="Client"
                placeholder="Search client..."
                required
                emptyMessage="No clients available"
                maxSelection={1}
              />
            </div>

            <div className="md:col-span-2">
              <SearchableMultiSelect
                options={filteredJobs.map((job) => ({
                  value: job._id,
                  label: job.jobNo,
                  sublabel: job.jobName,
                }))}
                selectedValues={formData.jobIds}
                onChange={(newJobIds) => {
                  setFormData({ ...formData, jobIds: newJobIds });
                  updateJobDetails(newJobIds);
                }}
                label="Job Numbers"
                placeholder="Search jobs by number or name..."
                disabled={!formData.clientId}
                required={true}
                emptyMessage={formData.clientId ? 'No jobs available for this client' : 'Please select a client first'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Estimate Date (BS) <span className="text-red-500">*</span>
              </label>
              <NepaliDatePicker
                value={formData.estimateDate}
                onChange={(value) => setFormData({ ...formData, estimateDate: value })}
                placeholder="YYYY-MM-DD"
                required
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

            <div>
              <label className="block text-sm font-medium text-gray-700">Finish Size</label>
              <input
                type="text"
                disabled
                value={jobDetails.finishSize}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Particulars</h2>
              <button
                type="button"
                onClick={handleLoadDefaultParticulars}
                disabled={loadingDefaults}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingDefaults ? 'Loading...' : 'Load Default Particulars'}
              </button>
            </div>
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

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Notes</h2>
            <DeliveryNotesTable
              deliveryNotes={deliveryNotes}
              onChange={setDeliveryNotes}
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Update Estimate'}
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
