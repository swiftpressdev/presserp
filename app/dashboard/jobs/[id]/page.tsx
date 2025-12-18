'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import {
  JobType,
  PlateBy,
  LaminationType,
  BindingType,
  StitchType,
  AdditionalService,
  PlateFarmaType,
  PlateSizeType,
  NormalType,
  PageColorType,
  BookSizeType,
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
  status: string;
}

interface Job {
  _id: string;
  jobNo: string;
  jobName: string;
}

export default function EditJobPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [formData, setFormData] = useState({
    jobName: '',
    clientId: '',
    jobDate: '',
    deliveryDate: '',
    jobTypes: [] as JobType[],
    quantity: 1,
    paperId: '',
    paperSize: '',
    totalBWPages: 0,
    totalColorPages: 0,
    pageColor: '' as PageColorType | '',
    pageColorOther: '',
    bookSize: '' as BookSizeType | '',
    bookSizeOther: '',
    totalPlate: '',
    totalFarma: '',
    plateBy: PlateBy.COMPANY,
    plateFrom: '',
    plateSize: '' as PlateSizeType | '',
    plateSizeOther: '',
    machineId: '',
    laminationThermal: '' as LaminationType | '',
    normal: '' as NormalType | '',
    folding: false,
    binding: '' as BindingType | '',
    bindingOther: '',
    stitch: '' as StitchType | '',
    stitchOther: '',
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
    if (user && jobId) {
      fetchDropdownData();
      fetchJob();
    }
  }, [user, jobId]);

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

  const fetchJob = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch job');
      }

      const job = data.job;
      const clientId = typeof job.clientId === 'object' ? job.clientId._id.toString() : job.clientId.toString();
      const paperId = typeof job.paperId === 'object' ? job.paperId._id.toString() : job.paperId.toString();
      const machineId = typeof job.machineId === 'object' ? job.machineId._id.toString() : job.machineId.toString();
      const relatedToJobId = job.relatedToJobId ? (typeof job.relatedToJobId === 'object' ? job.relatedToJobId._id.toString() : job.relatedToJobId.toString()) : '';

      setFormData({
        jobName: job.jobName || '',
        clientId,
        jobDate: job.jobDate || '',
        deliveryDate: job.deliveryDate || '',
        jobTypes: job.jobTypes || [],
        quantity: job.quantity || 1,
        paperId,
        paperSize: job.paperSize || '',
        totalBWPages: job.totalBWPages || 0,
        totalColorPages: job.totalColorPages || 0,
        pageColor: job.pageColor || '',
        pageColorOther: job.pageColorOther || '',
        bookSize: job.bookSize || '',
        bookSizeOther: job.bookSizeOther || '',
        totalPlate: job.totalPlate || '',
        totalFarma: job.totalFarma || '',
        plateBy: job.plateBy || PlateBy.COMPANY,
        plateFrom: job.plateFrom || '',
        plateSize: job.plateSize || '',
        plateSizeOther: job.plateSizeOther || '',
        machineId,
        laminationThermal: job.laminationThermal || '',
        normal: job.normal || '',
        folding: job.folding || false,
        binding: job.binding || '',
        bindingOther: job.bindingOther || '',
        stitch: job.stitch || '',
        stitchOther: job.stitchOther || '',
        additional: job.additional || [],
        relatedToJobId,
        remarks: job.remarks || '',
        specialInstructions: job.specialInstructions || '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch job');
      router.push('/dashboard/jobs');
    } finally {
      setLoading(false);
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

    setSaving(true);

    try {
      const submitData = {
        ...formData,
        pageColor: formData.pageColor || undefined,
        pageColorOther: formData.pageColor === PageColorType.OTHER ? formData.pageColorOther : undefined,
        bookSize: formData.bookSize || undefined,
        bookSizeOther: formData.bookSize === BookSizeType.OTHER ? formData.bookSizeOther : undefined,
        totalPlate: formData.totalPlate || undefined,
        totalFarma: formData.totalFarma || undefined,
        plateSize: formData.plateSize || undefined,
        plateSizeOther: formData.plateSize === PlateSizeType.OTHER ? formData.plateSizeOther : undefined,
        laminationThermal: formData.laminationThermal || undefined,
        normal: formData.normal || undefined,
        binding: formData.binding || undefined,
        bindingOther: formData.binding === BindingType.OTHER ? formData.bindingOther : undefined,
        stitch: formData.stitch || undefined,
        stitchOther: formData.stitch === StitchType.OTHER ? formData.stitchOther : undefined,
        relatedToJobId: formData.relatedToJobId || undefined,
      };

      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update job');
      }

      toast.success('Job updated successfully');
      router.push('/dashboard/jobs');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update job');
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
          <div className="text-lg">Loading job...</div>
        </div>
      </DashboardLayout>
    );
  }

  const totalPages = formData.totalBWPages + formData.totalColorPages;

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Job</h1>

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
                    <span>{type}{type === JobType.OUTER ? ' (Cover)' : ''}</span>
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
                value={formData.quantity === 0 ? '' : formData.quantity}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                  setFormData({ ...formData, quantity: value });
                }}
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
                value={formData.totalBWPages === 0 ? '' : formData.totalBWPages}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                  setFormData({ ...formData, totalBWPages: value });
                }}
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
                value={formData.totalColorPages === 0 ? '' : formData.totalColorPages}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                  setFormData({ ...formData, totalColorPages: value });
                }}
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
              <label className="block text-sm font-medium text-gray-700">Page Color</label>
              <select
                value={formData.pageColor}
                onChange={(e) => setFormData({ ...formData, pageColor: e.target.value as PageColorType | '', pageColorOther: '' })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">None</option>
                {Object.values(PageColorType).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {formData.pageColor === PageColorType.OTHER && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Specify Page Color <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.pageColorOther}
                  onChange={(e) => setFormData({ ...formData, pageColorOther: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Book Size</label>
              <select
                value={formData.bookSize}
                onChange={(e) => setFormData({ ...formData, bookSize: e.target.value as BookSizeType | '', bookSizeOther: '' })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">None</option>
                {Object.values(BookSizeType).map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            {formData.bookSize === BookSizeType.OTHER && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Specify Book Size <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.bookSizeOther}
                  onChange={(e) => setFormData({ ...formData, bookSizeOther: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Total Plate</label>
              <input
                type="text"
                value={formData.totalPlate}
                onChange={(e) => setFormData({ ...formData, totalPlate: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter total plate"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Total Farma</label>
              <input
                type="text"
                value={formData.totalFarma}
                onChange={(e) => setFormData({ ...formData, totalFarma: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter total farma"
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
              <select
                value={formData.plateSize}
                onChange={(e) => setFormData({ ...formData, plateSize: e.target.value as PlateSizeType | '', plateSizeOther: '' })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">None</option>
                {Object.values(PlateSizeType).map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            {formData.plateSize === PlateSizeType.OTHER && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Specify Plate Size <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.plateSizeOther}
                  onChange={(e) => setFormData({ ...formData, plateSizeOther: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

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
                {equipment.filter((eq) => eq.status === 'Operational').map((eq) => (
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
              <label className="block text-sm font-medium text-gray-700">Normal</label>
              <select
                value={formData.normal}
                onChange={(e) =>
                  setFormData({ ...formData, normal: e.target.value as NormalType | '' })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">None</option>
                {Object.values(NormalType).map((type) => (
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
                onChange={(e) => setFormData({ ...formData, binding: e.target.value as BindingType | '', bindingOther: '' })}
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

            {formData.binding === BindingType.OTHER && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Specify Binding <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.bindingOther}
                  onChange={(e) => setFormData({ ...formData, bindingOther: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter binding type"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Stitch</label>
              <select
                value={formData.stitch}
                onChange={(e) => setFormData({ ...formData, stitch: e.target.value as StitchType | '', stitchOther: '' })}
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

            {formData.stitch === StitchType.OTHER && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Specify Stitch <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.stitchOther}
                  onChange={(e) => setFormData({ ...formData, stitchOther: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter stitch type"
                />
              </div>
            )}

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
                {jobs.filter(j => j._id !== jobId).map((job) => (
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
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Update Job'}
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
