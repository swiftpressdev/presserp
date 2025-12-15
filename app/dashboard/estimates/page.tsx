'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { generateEstimatePDF } from '@/lib/pdfUtils';
import { formatBSDate } from '@/lib/dateUtils';
import ParticularsTable, { Particular } from '@/components/ParticularsTable';

interface Estimate {
  _id: string;
  estimateNumber: string;
  estimateDate: string;
  clientId: string | { _id: string; clientName: string };
  jobId: string | { _id: string; jobNo: string; jobName: string };
  totalBWPages: number;
  totalColorPages: number;
  totalPages: number;
  paperSize: string;
  particulars: any[];
  total: number;
  hasVAT: boolean;
  subtotal?: number;
  vatAmount?: number;
  grandTotal: number;
}

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

export default function EstimatesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [editFormData, setEditFormData] = useState({
    clientId: '',
    jobId: '',
    estimateDate: '',
  });
  const [jobDetails, setJobDetails] = useState({
    totalBWPages: 0,
    totalColorPages: 0,
    totalPages: 0,
    paperSize: '',
  });
  const [editParticulars, setEditParticulars] = useState<Particular[]>([]);
  const [editHasVAT, setEditHasVAT] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchEstimates();
      fetchDropdownData();
    }
  }, [user]);

  const fetchEstimates = async () => {
    try {
      const response = await fetch('/api/estimates');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setEstimates(data.estimates);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch estimates');
    } finally {
      setLoading(false);
    }
  };

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

      setClients(clientsData.clients || []);
      setAllJobs(jobsData.jobs || []);
    } catch (error) {
      console.error('Failed to fetch dropdown data:', error);
    }
  };

  const handleEdit = (estimate: Estimate) => {
    setEditingEstimate(estimate);
    
    // Extract IDs from populated objects
    const clientId = typeof estimate.clientId === 'object' ? estimate.clientId._id.toString() : estimate.clientId.toString();
    const jobId = typeof estimate.jobId === 'object' ? estimate.jobId._id.toString() : estimate.jobId.toString();

    setEditFormData({
      clientId,
      jobId,
      estimateDate: estimate.estimateDate,
    });

    // Filter jobs for selected client
    const filtered = allJobs.filter((job) => {
      const jobClientId = typeof job.clientId === 'object' ? job.clientId._id.toString() : job.clientId.toString();
      return jobClientId === clientId;
    });
    setFilteredJobs(filtered);

    // Get job details
    const selectedJob = allJobs.find((job) => job._id === jobId);
    if (selectedJob) {
      setJobDetails({
        totalBWPages: selectedJob.totalBWPages,
        totalColorPages: selectedJob.totalColorPages,
        totalPages: selectedJob.totalPages,
        paperSize: selectedJob.paperSize,
      });
    } else {
      setJobDetails({
        totalBWPages: estimate.totalBWPages,
        totalColorPages: estimate.totalColorPages,
        totalPages: estimate.totalPages,
        paperSize: estimate.paperSize,
      });
    }

    // Convert particulars to match Particular interface
    const convertedParticulars: Particular[] = estimate.particulars.map((p: any) => ({
      sn: p.sn || 0,
      particulars: p.particulars || '',
      quantity: p.quantity || 0,
      rate: p.rate || 0,
      amount: p.amount || 0,
    }));
    setEditParticulars(convertedParticulars.length > 0 ? convertedParticulars : [
      { sn: 1, particulars: '', quantity: 0, rate: 0, amount: 0 },
    ]);
    setEditHasVAT(estimate.hasVAT);
    setShowEditModal(true);
  };

  const handleClientChange = (clientId: string) => {
    setEditFormData({ ...editFormData, clientId, jobId: '' });
    setJobDetails({ totalBWPages: 0, totalColorPages: 0, totalPages: 0, paperSize: '' });

    const filtered = allJobs.filter((job) => {
      const jobClientId = typeof job.clientId === 'object' ? job.clientId._id.toString() : job.clientId.toString();
      return jobClientId === clientId;
    });
    setFilteredJobs(filtered);
  };

  const handleJobChange = (jobId: string) => {
    setEditFormData({ ...editFormData, jobId });

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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEstimate) return;

    // Filter out empty rows
    const validParticulars = editParticulars.filter(
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

    try {
      const response = await fetch(`/api/estimates/${editingEstimate._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editFormData,
          particulars: indexedParticulars,
          hasVAT: editHasVAT,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update estimate');
      }

      toast.success('Estimate updated successfully');
      setShowEditModal(false);
      setEditingEstimate(null);
      fetchEstimates();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update estimate');
    }
  };

  const handleExportPDF = (estimate: Estimate) => {
    const clientName = typeof estimate.clientId === 'object' ? estimate.clientId.clientName : '-';
    const jobNumber = typeof estimate.jobId === 'object' ? estimate.jobId.jobNo : '-';
    
    generateEstimatePDF({
      estimateNumber: estimate.estimateNumber,
      estimateDate: formatBSDate(estimate.estimateDate),
      clientName,
      jobNumber,
      totalBWPages: estimate.totalBWPages,
      totalColorPages: estimate.totalColorPages,
      totalPages: estimate.totalPages,
      paperSize: estimate.paperSize,
      particulars: estimate.particulars,
      total: estimate.total,
      hasVAT: estimate.hasVAT,
      subtotal: estimate.subtotal,
      vatAmount: estimate.vatAmount,
      grandTotal: estimate.grandTotal,
    });
    toast.success('PDF exported successfully');
  };

  const handleDelete = async (estimateId: string, estimateNumber: string) => {
    if (!confirm(`Are you sure you want to delete estimate "${estimateNumber}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/estimates/${estimateId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete estimate');
      }

      toast.success('Estimate deleted successfully');
      fetchEstimates();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete estimate');
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
          <h1 className="text-3xl font-bold text-gray-900">Estimates</h1>
          <Link
            href="/dashboard/estimates/create"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Create Estimate
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading estimates...</div>
        ) : estimates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No estimates found. Create your first estimate.</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estimate No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grand Total
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {estimates.map((estimate) => (
                  <tr key={estimate._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {estimate.estimateNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatBSDate(estimate.estimateDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {typeof estimate.clientId === 'object' ? estimate.clientId.clientName : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {typeof estimate.jobId === 'object' ? estimate.jobId.jobNo : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {estimate.grandTotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm space-x-2">
                      <button
                        onClick={() => handleEdit(estimate)}
                        className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleExportPDF(estimate)}
                        className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
                      >
                        Export PDF
                      </button>
                      <button
                        onClick={() => handleDelete(estimate._id, estimate.estimateNumber)}
                        className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700"
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

        {/* Edit Modal */}
        {showEditModal && editingEstimate && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-5xl shadow-lg rounded-md bg-white mb-10">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Estimate</h3>
                <form onSubmit={handleUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Client</label>
                      <select
                        required
                        value={editFormData.clientId}
                        onChange={(e) => handleClientChange(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
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
                      <label className="block text-sm font-medium text-gray-700">Job Number</label>
                      <select
                        required
                        value={editFormData.jobId}
                        onChange={(e) => handleJobChange(e.target.value)}
                        disabled={!editFormData.clientId}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
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
                      <label className="block text-sm font-medium text-gray-700">Estimate Date (BS)</label>
                      <input
                        type="text"
                        required
                        value={editFormData.estimateDate}
                        onChange={(e) => setEditFormData({ ...editFormData, estimateDate: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="YYYY-MM-DD"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Paper Size</label>
                      <input
                        type="text"
                        disabled
                        value={jobDetails.paperSize}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total B/W Pages</label>
                      <input
                        type="text"
                        disabled
                        value={jobDetails.totalBWPages}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Color Pages</label>
                      <input
                        type="text"
                        disabled
                        value={jobDetails.totalColorPages}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Pages</label>
                      <input
                        type="text"
                        disabled
                        value={jobDetails.totalPages}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Particulars</h4>
                    <ParticularsTable
                      particulars={editParticulars}
                      onChange={setEditParticulars}
                      hasVAT={editHasVAT}
                      onVATChange={setEditHasVAT}
                    />
                  </div>

                  <div className="flex justify-end space-x-3 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingEstimate(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Update
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
