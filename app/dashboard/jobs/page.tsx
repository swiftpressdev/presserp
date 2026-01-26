'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import AdvancedSearchBar, { SearchField } from '@/components/AdvancedSearchBar';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatBSDate } from '@/lib/dateUtils';
import { generateJobPDF } from '@/lib/pdfUtils';
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

interface Job {
  _id: string;
  jobNo: string;
  jobName: string;
  clientId: string | { _id: string; clientName: string };
  paperId: string | { _id: string; paperName: string; paperSize: string };
  machineId: string | { _id: string; equipmentName: string };
  jobDate: string;
  deliveryDate: string;
  jobTypes: string[];
  quantity: number;
  paperFrom?: 'customer' | 'company';
  paperFromCustom?: string;
  paperSize: string;
  totalBWPages: number;
  totalColorPages: number;
  totalPages: number;
  pageColor?: string;
  pageColorOther?: string;
  bookSize?: string;
  bookSizeOther?: string;
  totalPlate?: string;
  totalPlateOther?: string;
  totalFarma?: string;
  totalFarmaOther?: string;
  plateBy: string;
  plateFrom?: string;
  plateSize?: string;
  plateSizeOther?: string;
  laminationThermal?: string;
  normal?: string;
  folding: boolean;
  binding?: string;
  bindingOther?: string;
  stitch?: string;
  stitchOther?: string;
  additional?: string[];
  relatedToJobId?: string | string[] | { _id: string; jobNo: string } | Array<{ _id: string; jobNo: string; jobName?: string }>;
  remarks?: string;
  specialInstructions?: string;
}

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

export default function JobsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState<Record<string, any>>({});

  const searchFields: SearchField[] = [
    { key: 'jobNo', label: 'Job No', type: 'text' },
    { key: 'jobName', label: 'Job Name', type: 'text' },
    { key: 'clientName', label: 'Client Name', type: 'text' },
    { key: 'jobDate', label: 'Job Date', type: 'date' },
    { key: 'deliveryDate', label: 'Delivery Date', type: 'date' },
    { key: 'totalPages', label: 'Total Pages', type: 'numberRange' },
    { key: 'quantity', label: 'Quantity', type: 'numberRange' },
  ];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchJobs();
    }
  }, [user]);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setJobs(data.jobs);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (job: Job) => {
    router.push(`/dashboard/jobs/${job._id}`);
  };


  const handleExportPDF = async (job: Job) => {
    try {
      const clientName = typeof job.clientId === 'object' ? job.clientId.clientName : '';
      const clientAddress = typeof job.clientId === 'object' ? (job.clientId as any).address : '';
      const paperName = typeof job.paperId === 'object' ? (job.paperId as any).paperName : '';
      const paperType = typeof job.paperId === 'object' ? (job.paperId as any).paperType : '';
      const paperTypeOther = typeof job.paperId === 'object' ? (job.paperId as any).paperTypeOther : '';
      // Get paperType from job if available, otherwise from paperId
      const finalPaperType = (job as any).paperType || (paperType === 'Other' && paperTypeOther ? paperTypeOther : paperType) || paperName || '-';
      const machineName = typeof job.machineId === 'object' ? job.machineId.equipmentName : '';
      const relatedToJobNos = job.relatedToJobId
        ? (Array.isArray(job.relatedToJobId)
          ? job.relatedToJobId.map((r: any) => typeof r === 'object' ? r.jobNo : r).filter(Boolean)
          : (typeof job.relatedToJobId === 'object' ? [job.relatedToJobId.jobNo] : []))
        : [];
      const relatedToJobNo = relatedToJobNos.length > 0 ? relatedToJobNos.join(', ') : undefined;
      
      // Format job types with (Cover) for Outer
      const formattedJobTypes = job.jobTypes.map(type => 
        type === JobType.OUTER ? `${type} (Cover)` : type
      );

      await generateJobPDF({
        jobNo: job.jobNo,
        jobName: job.jobName,
        clientName,
        clientAddress,
        jobDate: formatBSDate(job.jobDate),
        deliveryDate: formatBSDate(job.deliveryDate),
        jobTypes: formattedJobTypes,
        quantity: job.quantity,
        paperBy: (job as any).paperBy || job.paperFrom,
        paperFrom: (job as any).paperFrom || '',
        paperFromCustom: job.paperFromCustom,
        paperName,
        paperType: finalPaperType,
        paperSize: job.paperSize || ((job as any).paperDetails?.map((d: any) => d.size).filter((s: string, i: number, arr: string[]) => s && arr.indexOf(s) === i).join(', ')) || '',
        paperWeight: (job as any).paperWeight || '',
        paperDetails: (job as any).paperDetails || undefined,
        totalBWPages: job.totalBWPages,
        totalColorPages: job.totalColorPages,
        totalPages: job.totalPages,
        pageColor: job.pageColor,
        pageColorOther: job.pageColorOther,
        bookSize: job.bookSize,
        bookSizeOther: job.bookSizeOther,
        totalPlate: job.totalPlate,
        totalFarma: job.totalFarma,
        plateBy: job.plateBy,
        plateFrom: job.plateFrom,
        plateSize: job.plateSize,
        plateSizeOther: job.plateSizeOther,
        machineName,
        laminationThermal: job.laminationThermal,
        normal: job.normal,
        folding: job.folding,
        binding: job.binding,
        bindingOther: job.bindingOther,
        stitch: job.stitch,
        stitchOther: job.stitchOther,
        additional: job.additional,
        relatedToJobNo,
        remarks: job.remarks,
        specialInstructions: job.specialInstructions,
      });
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  const handleDelete = async (jobId: string, jobNo: string) => {
    if (!confirm(`Are you sure you want to delete job "${jobNo}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete job');
      }

      toast.success('Job deleted successfully');
      fetchJobs();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete job');
    }
  };

  const handleSearch = (params: Record<string, any>) => {
    setSearchParams(params);
  };

  const handleReset = () => {
    setSearchParams({});
  };

  const filteredJobs = useMemo(() => {
    if (Object.keys(searchParams).length === 0) {
      return jobs;
    }

    return jobs.filter((job) => {
      return Object.keys(searchParams).every((key) => {
        const searchValue = searchParams[key];
        if (!searchValue || (typeof searchValue === 'object' && Object.values(searchValue).every((v) => !v))) {
          return true;
        }

        if ((key === 'totalPages' || key === 'quantity') && typeof searchValue === 'object') {
          const min = searchValue.min;
          const max = searchValue.max;
          const jobValue = (job as any)[key];
          if (min !== undefined && min !== '' && jobValue < Number(min)) return false;
          if (max !== undefined && max !== '' && jobValue > Number(max)) return false;
          return true;
        }

        if (key === 'clientName') {
          const clientName = typeof job.clientId === 'object' ? job.clientId.clientName : '';
          return clientName.toLowerCase().includes(searchValue.toString().toLowerCase());
        }

        if (key === 'jobDate' || key === 'deliveryDate') {
          const jobDate = job[key as 'jobDate' | 'deliveryDate'];
          return jobDate === searchValue;
        }

        const jobValue = (job as any)[key]?.toString().toLowerCase() || '';
        return jobValue.includes(searchValue.toString().toLowerCase());
      });
    });
  }, [jobs, searchParams]);

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
          <h1 className="text-3xl font-bold text-gray-900">Jobs</h1>
          <Link
            href="/dashboard/jobs/create"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Create Job
          </Link>
        </div>

        {!loading && jobs.length > 0 && (
          <AdvancedSearchBar fields={searchFields} onSearch={handleSearch} onReset={handleReset} />
        )}

        {loading ? (
          <div className="text-center py-12">Loading jobs...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">
              {jobs.length === 0 ? 'No jobs found. Create your first job.' : 'No jobs match your search criteria.'}
            </p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Pages
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredJobs.map((job) => (
                  <tr key={job._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {job.jobNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.jobName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {typeof job.clientId === 'object' ? job.clientId.clientName : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatBSDate(job.jobDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatBSDate(job.deliveryDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.totalPages}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm space-x-2">
                      <Link
                        href={`/dashboard/jobs/view/${job._id}`}
                        className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
                      >
                        View
                      </Link>
                      <Link
                        href={`/dashboard/jobs/${job._id}`}
                        className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleExportPDF(job)}
                        className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
                      >
                        Export PDF
                      </button>
                      <button
                        onClick={() => handleDelete(job._id, job.jobNo)}
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

      </div>
    </DashboardLayout>
  );
}
