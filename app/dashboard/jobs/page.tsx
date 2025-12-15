'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatBSDate } from '@/lib/dateUtils';
import { generateJobPDF } from '@/lib/pdfUtils';

interface Job {
  _id: string;
  jobNo: string;
  jobName: string;
  clientId: { clientName: string };
  paperId: { paperName: string };
  machineId: { equipmentName: string };
  jobDate: string;
  deliveryDate: string;
  jobTypes: string[];
  quantity: number;
  paperSize: string;
  totalBWPages: number;
  totalColorPages: number;
  totalPages: number;
  plateBy: string;
  plateFrom?: string;
  plateSize?: string;
  laminationThermal?: string;
  folding: boolean;
  binding?: string;
  stitch?: string;
  additional?: string[];
  relatedToJobId?: { jobNo: string };
  remarks?: string;
  specialInstructions?: string;
}

export default function JobsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleExportPDF = (job: Job) => {
    generateJobPDF({
      jobNo: job.jobNo,
      jobName: job.jobName,
      clientName: job.clientId.clientName,
      jobDate: formatBSDate(job.jobDate),
      deliveryDate: formatBSDate(job.deliveryDate),
      jobTypes: job.jobTypes,
      quantity: job.quantity,
      paperName: job.paperId.paperName,
      paperSize: job.paperSize,
      totalBWPages: job.totalBWPages,
      totalColorPages: job.totalColorPages,
      totalPages: job.totalPages,
      plateBy: job.plateBy,
      plateFrom: job.plateFrom,
      plateSize: job.plateSize,
      machineName: job.machineId.equipmentName,
      laminationThermal: job.laminationThermal,
      folding: job.folding,
      binding: job.binding,
      stitch: job.stitch,
      additional: job.additional,
      relatedToJobNo: job.relatedToJobId?.jobNo,
      remarks: job.remarks,
      specialInstructions: job.specialInstructions,
    });
    toast.success('PDF exported successfully');
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

        {loading ? (
          <div className="text-center py-12">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No jobs found. Create your first job.</p>
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
                {jobs.map((job) => (
                  <tr key={job._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {job.jobNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.jobName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.clientId.clientName}
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
