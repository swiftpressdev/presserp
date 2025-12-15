'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { getCurrentBSDate } from '@/lib/dateUtils';
import {
  JobType,
  PlateBy,
  LaminationType,
  BindingType,
  StitchType,
  AdditionalService,
} from '@/lib/types';
import toast from 'react-hot-toast';

interface Client {
  _id: string;
  clientName: string;
}

interface Paper {
  _id: string;
  paperName: string;
  paperSize: string;
}

interface Equipment {
  _id: string;
  equipmentName: string;
}

interface Job {
  _id: string;
  jobNo: string;
  jobName: string;
}

export default function CreateJobPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [formData, setFormData] = useState({
    jobName: '',
    clientId: '',
    jobDate: getCurrentBSDate(),
    deliveryDate: getCurrentBSDate(),
    jobTypes: [] as JobType[],
    quantity: 1,
    paperId: '',
    paperSize: '',
    totalBWPages: 0,
    totalColorPages: 0,
    plateBy: PlateBy.COMPANY,
    plateFrom: '',
    plateSize: '',
    machineId: '',
    laminationThermal: '' as LaminationType | '',
    folding: false,
    binding: '' as BindingType | '',
    stitch: '' as StitchType | '',
    additional: [] as AdditionalService[],
    relatedToJobId: '',
    remarks: '',
    specialInstructions: '',
  });

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
      const [clientsRes, papersRes, equipmentRes, jobsRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/papers'),
        fetch('/api/equipment'),
        fetch('/api/jobs'),
      ]);

      const [clientsData, papersData, equipmentData, jobsData] = await Promise.all([
        clientsRes.json(),
        papersRes.json(),
        equipmentRes.json(),
        jobsRes.json(),
      ]);

      setClients(clientsData.clients || []);
      setPapers(papersData.papers || []);
      setEquipment(equipmentData.equipment || []);
      setJobs(jobsData.jobs || []);
    } catch (error) {
      console.error('Failed to fetch dropdown data:', error);
    }
  };

  const handleJobTypeChange = (type: JobType) => {
    const updated = formData.jobTypes.includes(type)
      ? formData.jobTypes.filter((t) => t !== type)
      : [...formData.jobTypes, type];
    setFormData({ ...formData, jobTypes: updated });
  };

  const handleAdditionalChange = (service: AdditionalService) => {
    const updated = formData.additional.includes(service)
      ? formData.additional.filter((s) => s !== service)
      : [...formData.additional, service];
    setFormData({ ...formData, additional: updated });
  };

  const handlePaperChange = (paperId: string) => {
    const selectedPaper = papers.find((p) => p._id === paperId);
    setFormData({
      ...formData,
      paperId,
      paperSize: selectedPaper?.paperSize || '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.jobTypes.length === 0) {
      toast.error('Please select at least one job type');
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        ...formData,
        laminationThermal: formData.laminationThermal || undefined,
        binding: formData.binding || undefined,
        stitch: formData.stitch || undefined,
        relatedToJobId: formData.relatedToJobId || undefined,
      };

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create job');
      }

      toast.success('Job created successfully');
      router.push('/dashboard/jobs');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create job');
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

  const totalPages = formData.totalBWPages + formData.totalColorPages;

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Job</h1>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Job Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.jobName}
                onChange={(e) => setFormData({ ...formData, jobName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

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
                Job Date (BS) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.jobDate}
                onChange={(e) => setFormData({ ...formData, jobDate: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="YYYY-MM-DD"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Delivery Date (BS) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.deliveryDate}
                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="YYYY-MM-DD"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                {Object.values(JobType).map((type) => (
                  <label key={type} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.jobTypes.includes(type)}
                      onChange={() => handleJobTypeChange(type)}
                      className="rounded"
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Paper Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.paperId}
                onChange={(e) => handlePaperChange(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Paper</option>
                {papers.map((paper) => (
                  <option key={paper._id} value={paper._id}>
                    {paper.paperName} - {paper.paperSize}
                  </option>
                ))}
              </select>
            </div>

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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Total B/W Pages <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.totalBWPages}
                onChange={(e) =>
                  setFormData({ ...formData, totalBWPages: parseInt(e.target.value) })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Total Color Pages <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.totalColorPages}
                onChange={(e) =>
                  setFormData({ ...formData, totalColorPages: parseInt(e.target.value) })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Total Pages</label>
              <input
                type="text"
                disabled
                value={totalPages}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Plate By <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.plateBy}
                onChange={(e) => setFormData({ ...formData, plateBy: e.target.value as PlateBy })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.values(PlateBy).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Plate From</label>
              <input
                type="text"
                value={formData.plateFrom}
                onChange={(e) => setFormData({ ...formData, plateFrom: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Plate Size</label>
              <input
                type="text"
                value={formData.plateSize}
                onChange={(e) => setFormData({ ...formData, plateSize: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Machine <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.machineId}
                onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Machine</option>
                {equipment.map((eq) => (
                  <option key={eq._id} value={eq._id}>
                    {eq.equipmentName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Lamination Thermal</label>
              <select
                value={formData.laminationThermal}
                onChange={(e) =>
                  setFormData({ ...formData, laminationThermal: e.target.value as LaminationType | '' })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">None</option>
                {Object.values(LaminationType).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Folding</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="folding"
                    checked={formData.folding === true}
                    onChange={() => setFormData({ ...formData, folding: true })}
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="folding"
                    checked={formData.folding === false}
                    onChange={() => setFormData({ ...formData, folding: false })}
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Binding</label>
              <select
                value={formData.binding}
                onChange={(e) => setFormData({ ...formData, binding: e.target.value as BindingType | '' })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">None</option>
                {Object.values(BindingType).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Stitch</label>
              <select
                value={formData.stitch}
                onChange={(e) => setFormData({ ...formData, stitch: e.target.value as StitchType | '' })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">None</option>
                {Object.values(StitchType).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Services</label>
              <div className="flex flex-wrap gap-4">
                {Object.values(AdditionalService).map((service) => (
                  <label key={service} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.additional.includes(service)}
                      onChange={() => handleAdditionalChange(service)}
                      className="rounded"
                    />
                    <span>{service}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Related To Job</label>
              <select
                value={formData.relatedToJobId}
                onChange={(e) => setFormData({ ...formData, relatedToJobId: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">None</option>
                {jobs.map((job) => (
                  <option key={job._id} value={job._id}>
                    {job.jobNo} - {job.jobName}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Remarks</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Special Instructions
              </label>
              <textarea
                value={formData.specialInstructions}
                onChange={(e) =>
                  setFormData({ ...formData, specialInstructions: e.target.value })
                }
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Job'}
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
