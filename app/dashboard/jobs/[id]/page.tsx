'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import SearchableMultiSelect from '@/components/SearchableMultiSelect';
import NepaliDatePicker from '@/components/NepaliDatePicker';
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
  clientName: string;
  paperType: string;
  paperTypeOther?: string;
  paperSize: string;
  paperWeight: string;
  units: string;
}

interface PaperDetail {
  paperId: string;
  type: string;
  size: string;
  weight: string;
  paperFrom: string;
  unit: string;
  issuedQuantity: number;
  wastage: number;
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
    paperBy: '' as 'customer' | 'company' | '',
    paperFrom: '',
    paperFromCustom: '',
    paperIds: [] as string[],
    paperId: '',
    paperDetails: [] as PaperDetail[],
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
      const clientId = job.clientId 
        ? (typeof job.clientId === 'object' ? job.clientId._id?.toString() || '' : job.clientId?.toString() || '')
        : '';
      const paperId = job.paperId 
        ? (typeof job.paperId === 'object' ? job.paperId._id?.toString() || '' : job.paperId?.toString() || '')
        : '';
      const machineId = job.machineId 
        ? (typeof job.machineId === 'object' ? job.machineId._id?.toString() || '' : job.machineId?.toString() || '')
        : '';
      const relatedToJobId = job.relatedToJobId 
        ? (typeof job.relatedToJobId === 'object' ? job.relatedToJobId._id?.toString() || '' : job.relatedToJobId?.toString() || '')
        : '';
      const paperIds = job.paperIds && Array.isArray(job.paperIds)
        ? job.paperIds
            .filter((p: any) => p != null) // Filter out null/undefined
            .map((p: any) => typeof p === 'object' && p._id ? p._id.toString() : (p?.toString() || ''))
            .filter((id: string) => id !== '') // Filter out empty strings
        : [];

      // Load paperDetails if they exist, otherwise create from legacy fields for backward compatibility
      let paperDetails: PaperDetail[] = [];
      if ((job as any).paperDetails && Array.isArray((job as any).paperDetails) && (job as any).paperDetails.length > 0) {
        paperDetails = (job as any).paperDetails;
      } else if (paperIds.length > 0 && ((job as any).paperBy === 'customer' || job.paperFrom)) {
        // Backward compatibility: create paperDetails from legacy fields
        // Note: This is a fallback, ideally all jobs should have paperDetails
        paperDetails = paperIds.map((paperId: string) => {
          // Try to find paper details from populated paperIds
          const populatedPaper = Array.isArray(job.paperIds) 
            ? job.paperIds.find((p: any) => (typeof p === 'object' && p._id?.toString() === paperId.toString()))
            : null;
          
          return {
            paperId: paperId.toString(),
            type: populatedPaper?.paperType === 'Other' && populatedPaper?.paperTypeOther 
              ? populatedPaper.paperTypeOther 
              : (populatedPaper?.paperType || (job as any).paperType || ''),
            size: populatedPaper?.paperSize || job.paperSize || '',
            weight: populatedPaper?.paperWeight || (job as any).paperWeight || '',
            paperFrom: populatedPaper?.clientName || (job as any).paperFrom || '',
            unit: populatedPaper?.units || '',
            issuedQuantity: 0, // Will need to be set manually
            wastage: 0, // Will need to be set manually
          };
        });
      }

      setFormData({
        jobName: job.jobName || '',
        clientId,
        jobDate: job.jobDate || '',
        deliveryDate: job.deliveryDate || '',
        jobTypes: job.jobTypes || [],
        quantity: job.quantity || 1,
        paperBy: (job as any).paperBy || job.paperFrom || '',
        paperFrom: (job as any).paperFrom || '',
        paperFromCustom: job.paperFromCustom || '',
        paperIds,
        paperId,
        paperDetails,
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
    setFormData({
      ...formData,
      paperId,
    });
  };

  const handlePaperIdsChange = (selectedPaperIds: string[]) => {
    // Component now enforces maxSelection limit, so we can trust the length
    const selectedPapers = papers.filter((p) => selectedPaperIds.includes(p._id));
    
    // Preserve existing paperDetails for papers that are still selected
    const existingDetails = formData.paperDetails.filter(detail => 
      selectedPaperIds.includes(detail.paperId)
    );
    const existingPaperIds = existingDetails.map(d => d.paperId);
    
    // Create new paper detail objects for newly selected papers
    const newPaperDetails: PaperDetail[] = selectedPapers
      .filter(paper => !existingPaperIds.includes(paper._id))
      .map((paper) => ({
        paperId: paper._id,
        type: paper.paperType === 'Other' && paper.paperTypeOther ? paper.paperTypeOther : paper.paperType,
        size: paper.paperSize,
        weight: paper.paperWeight,
        paperFrom: paper.clientName,
        unit: paper.units,
        issuedQuantity: 0,
        wastage: 0,
      }));
    
    // Merge existing and new details, maintaining order
    const allDetails: PaperDetail[] = [];
    selectedPaperIds.forEach(paperId => {
      const existing = existingDetails.find(d => d.paperId === paperId);
      if (existing) {
        allDetails.push(existing);
      } else {
        const newDetail = newPaperDetails.find(d => d.paperId === paperId);
        if (newDetail) {
          allDetails.push(newDetail);
        }
      }
    });
    
    setFormData({
      ...formData,
      paperIds: selectedPaperIds,
      paperDetails: allDetails,
    });
  };

  const handlePaperDetailChange = (index: number, field: keyof PaperDetail, value: string | number) => {
    const updatedDetails = [...formData.paperDetails];
    updatedDetails[index] = {
      ...updatedDetails[index],
      [field]: value,
    };
    
    // Validate wastage <= issuedQuantity
    if (field === 'wastage' || field === 'issuedQuantity') {
      const detail = updatedDetails[index];
      if (detail.wastage > detail.issuedQuantity) {
        toast.error(`Wastage (${detail.wastage}) cannot be more than issued quantity (${detail.issuedQuantity}) for paper: ${detail.type} - ${detail.size}`);
        // Reset wastage to issuedQuantity if wastage exceeds it
        if (field === 'wastage') {
          updatedDetails[index].wastage = detail.issuedQuantity;
        }
      }
    }
    
    setFormData({
      ...formData,
      paperDetails: updatedDetails,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.jobTypes.length === 0) {
      toast.error('Please select at least one job type');
      return;
    }

    // Validate wastage <= issuedQuantity for all paper details
    if ((formData.paperBy === 'customer' || formData.paperBy === 'company') && formData.paperDetails.length > 0) {
      for (const detail of formData.paperDetails) {
        if (detail.wastage > detail.issuedQuantity) {
          toast.error(`Wastage (${detail.wastage}) cannot be more than issued quantity (${detail.issuedQuantity}) for paper: ${detail.type} - ${detail.size}`);
          return;
        }
      }
    }

    setSaving(true);

    try {
      const submitData = {
        ...formData,
        paperBy: formData.paperBy || undefined,
        paperFrom: (formData.paperBy === 'customer' || formData.paperBy === 'company') ? formData.paperFrom : undefined,
        paperFromCustom: undefined, // Removed Page From (Custom) field
        paperIds: (formData.paperBy === 'customer' || formData.paperBy === 'company') && formData.paperIds.length > 0 ? formData.paperIds : undefined,
        paperId: (formData.paperBy === 'customer' || formData.paperBy === 'company') ? undefined : formData.paperId || undefined,
        paperDetails: (formData.paperBy === 'customer' || formData.paperBy === 'company') && formData.paperDetails.length > 0 ? formData.paperDetails : undefined,
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
              <SearchableMultiSelect
                options={clients.map((client) => ({
                  value: client._id,
                  label: client.clientName,
                }))}
                selectedValues={formData.clientId ? [formData.clientId] : []}
                onChange={(selectedClientIds) => {
                  setFormData({ ...formData, clientId: selectedClientIds[0] || '' });
                }}
                label="Client"
                placeholder="Search client..."
                required
                emptyMessage="No clients available"
                maxSelection={1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Job Date (BS) <span className="text-red-500">*</span>
              </label>
              <NepaliDatePicker
                value={formData.jobDate}
                onChange={(value) => setFormData({ ...formData, jobDate: value })}
                placeholder="YYYY-MM-DD"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Delivery Date (BS) <span className="text-red-500">*</span>
              </label>
              <NepaliDatePicker
                value={formData.deliveryDate}
                onChange={(value) => setFormData({ ...formData, deliveryDate: value })}
                placeholder="YYYY-MM-DD"
                required
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paper By <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="paperBy"
                    value="customer"
                    checked={formData.paperBy === 'customer'}
                    onChange={(e) => setFormData({ ...formData, paperBy: e.target.value as 'customer', paperIds: [], paperDetails: [] })}
                  />
                  <span>Customer</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="paperBy"
                    value="company"
                    checked={formData.paperBy === 'company'}
                    onChange={(e) => setFormData({ ...formData, paperBy: e.target.value as 'company', paperIds: [], paperDetails: [] })}
                  />
                  <span>Company</span>
                </label>
              </div>
            </div>

            {(formData.paperBy === 'customer' || formData.paperBy === 'company') && (
              <>
                <div className="md:col-span-2">
                  <SearchableMultiSelect
                    options={papers.map((paper) => ({
                      value: paper._id,
                      label: `${paper.clientName}-${paper.paperSize}-${paper.paperWeight}-${paper.paperType === 'Other' && paper.paperTypeOther ? paper.paperTypeOther : paper.paperType}`,
                    }))}
                    selectedValues={formData.paperIds}
                    onChange={handlePaperIdsChange}
                    label="Select Papers"
                    placeholder="Search papers..."
                    emptyMessage="No papers available"
                    maxSelection={4}
                  />
                </div>

                {/* Paper Details for each selected paper */}
                {formData.paperDetails.map((paperDetail, index) => (
                  <div key={paperDetail.paperId} className="md:col-span-2 border border-gray-200 rounded-lg p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Paper {index + 1}: {paperDetail.paperFrom} - {paperDetail.size} - {paperDetail.weight}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Type <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={paperDetail.type}
                          onChange={(e) => handlePaperDetailChange(index, 'type', e.target.value)}
                          disabled
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Size <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={paperDetail.size}
                          onChange={(e) => handlePaperDetailChange(index, 'size', e.target.value)}
                          disabled
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Weight <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={paperDetail.weight}
                          onChange={(e) => handlePaperDetailChange(index, 'weight', e.target.value)}
                          disabled
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Paper From <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={paperDetail.paperFrom}
                          onChange={(e) => handlePaperDetailChange(index, 'paperFrom', e.target.value)}
                          disabled
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Unit <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={paperDetail.unit}
                          onChange={(e) => handlePaperDetailChange(index, 'unit', e.target.value)}
                          disabled
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Issued Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={paperDetail.issuedQuantity}
                          onChange={(e) => handlePaperDetailChange(index, 'issuedQuantity', parseInt(e.target.value, 10) || 0)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter issued quantity"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Wastage <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={paperDetail.wastage}
                          onChange={(e) => handlePaperDetailChange(index, 'wastage', parseInt(e.target.value, 10) || 0)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter wastage"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Total B/W Pages <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.totalBWPages}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                  setFormData({ ...formData, totalBWPages: isNaN(value) ? 0 : value });
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
                value={formData.totalColorPages}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                  setFormData({ ...formData, totalColorPages: isNaN(value) ? 0 : value });
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
              <label className="block text-sm font-medium text-gray-700">Finish Size</label>
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
                  Specify Finish Size <span className="text-red-500">*</span>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plate By <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="plateBy"
                    value={PlateBy.COMPANY}
                    checked={formData.plateBy === PlateBy.COMPANY}
                    onChange={(e) => setFormData({ ...formData, plateBy: e.target.value as PlateBy })}
                  />
                  <span>Company</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="plateBy"
                    value={PlateBy.CUSTOMER}
                    checked={formData.plateBy === PlateBy.CUSTOMER}
                    onChange={(e) => setFormData({ ...formData, plateBy: e.target.value as PlateBy })}
                  />
                  <span>Customer</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Plate From</label>
              <input
                type="text"
                value={formData.plateFrom}
                onChange={(e) => setFormData({ ...formData, plateFrom: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter plate from"
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
              <SearchableMultiSelect
                options={jobs.filter(j => j._id !== jobId).map((job) => ({
                  value: job._id,
                  label: job.jobNo,
                  sublabel: job.jobName,
                }))}
                selectedValues={formData.relatedToJobId ? [formData.relatedToJobId] : []}
                onChange={(selectedJobIds) => {
                  setFormData({ ...formData, relatedToJobId: selectedJobIds[0] || '' });
                }}
                label="Related To Job"
                placeholder="Search job..."
                emptyMessage="No jobs available"
                maxSelection={1}
              />
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
