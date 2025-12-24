'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatBSDate } from '@/lib/dateUtils';
import { JobType } from '@/lib/types';

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

interface Job {
  _id: string;
  jobNo: string;
  jobName: string;
  clientId: string | { _id: string; clientName: string };
  paperId: string | { _id: string; paperName: string };
  machineId: string | { _id: string; equipmentName: string };
  relatedToJobId?: string | { _id: string; jobNo: string };
  jobDate: string;
  deliveryDate: string;
  jobTypes: string[];
  quantity: number;
  paperBy?: 'customer' | 'company';
  paperFrom?: string;
  paperFromCustom?: string;
  paperSize: string;
  paperDetails?: PaperDetail[];
  totalBWPages: number;
  totalColorPages: number;
  totalPages: number;
  pageColor?: string;
  pageColorOther?: string;
  bookSize?: string;
  bookSizeOther?: string;
  totalPlate?: string;
  totalFarma?: string;
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
  remarks?: string;
  specialInstructions?: string;
}

export default function ViewJobPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && jobId) {
      fetchJob();
    }
  }, [user, jobId]);

  const fetchJob = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch job');
      }

      setJob(data.job);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch job');
      router.push('/dashboard/jobs');
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">Loading job...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-red-600">Job not found</div>
        </div>
      </DashboardLayout>
    );
  }

  const clientName = typeof job.clientId === 'object' ? job.clientId.clientName : '-';
  const paperName = typeof job.paperId === 'object' ? (job.paperId as any).paperName : '-';
  const paperType = typeof job.paperId === 'object' 
    ? ((job.paperId as any).paperType === 'Other' && (job.paperId as any).paperTypeOther 
        ? (job.paperId as any).paperTypeOther 
        : (job.paperId as any).paperType)
    : ((job as any).paperType || '-');
  const machineName = typeof job.machineId === 'object' ? job.machineId.equipmentName : '-';
  const relatedToJobNo = job.relatedToJobId
    ? typeof job.relatedToJobId === 'object'
      ? job.relatedToJobId.jobNo
      : '-'
    : undefined;

  const formattedJobTypes = job.jobTypes.map((type) =>
    type === JobType.OUTER ? `${type} (Cover)` : type
  );

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">View Job</h1>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/jobs/${jobId}`}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Edit
            </Link>
            <Link
              href="/dashboard/jobs"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back
            </Link>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Job No</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {job.jobNo}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Job Name</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {job.jobName}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Client</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {clientName}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Job Date</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {formatBSDate(job.jobDate)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Delivery Date</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {formatBSDate(job.deliveryDate)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Job Type</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {formattedJobTypes.join(', ')}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {job.quantity}
              </div>
            </div>

            {job.paperBy && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Paper By</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {job.paperBy === 'customer' ? 'Customer' : 'Company'}
                </div>
              </div>
            )}

            {job.paperBy === 'company' && job.paperFromCustom && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Page From (Custom)</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {job.paperFromCustom}
                </div>
              </div>
            )}

            {job.paperBy === 'customer' && job.paperDetails && job.paperDetails.length > 0 ? (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-3">Paper Details</label>
                <div className="space-y-4">
                  {job.paperDetails.map((paperDetail, index) => (
                    <div key={paperDetail.paperId || index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Paper {index + 1}: {paperDetail.paperFrom} - {paperDetail.size} - {paperDetail.weight}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Type</label>
                          <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                            {paperDetail.type}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Size</label>
                          <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                            {paperDetail.size}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Weight</label>
                          <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                            {paperDetail.weight}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Paper From</label>
                          <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                            {paperDetail.paperFrom}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Unit</label>
                          <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                            {paperDetail.unit}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Issued Quantity</label>
                          <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                            {paperDetail.issuedQuantity}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Wastage</label>
                          <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                            {paperDetail.wastage}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Paper Type</label>
                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                    {paperType}
                  </div>
                </div>

                {job.paperSize && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Paper Size</label>
                    <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                      {job.paperSize}
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Total Pages</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {job.totalPages} (BW: {job.totalBWPages}, Color: {job.totalColorPages})
              </div>
            </div>

            {job.pageColor && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Page Color</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {job.pageColor === 'Other' && job.pageColorOther ? job.pageColorOther : job.pageColor}
                </div>
              </div>
            )}

            {job.bookSize && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Finish Size</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {job.bookSize === 'Other' && job.bookSizeOther ? job.bookSizeOther : job.bookSize}
                </div>
              </div>
            )}

            {job.totalPlate && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Plate</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {job.totalPlate}
                </div>
              </div>
            )}

            {job.totalFarma && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Farma</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {job.totalFarma}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Plate By</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {job.plateBy}
              </div>
            </div>

            {job.plateFrom && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Plate From</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {job.plateFrom}
                </div>
              </div>
            )}

            {job.plateSize && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Plate Size</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {job.plateSize === 'Other' && job.plateSizeOther ? job.plateSizeOther : job.plateSize}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Machine</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {machineName}
              </div>
            </div>

            {job.laminationThermal && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Lamination Thermal</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {job.laminationThermal}
                </div>
              </div>
            )}

            {job.normal && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Normal</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {job.normal}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Folding</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {job.folding ? 'Yes' : 'No'}
              </div>
            </div>

            {job.binding && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Binding</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {job.binding === 'Other' && job.bindingOther ? job.bindingOther : job.binding}
                </div>
              </div>
            )}

            {job.stitch && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Stitch</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {job.stitch === 'Other' && job.stitchOther ? job.stitchOther : job.stitch}
                </div>
              </div>
            )}

            {job.additional && job.additional.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Additional Services</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {job.additional.join(', ')}
                </div>
              </div>
            )}

            {relatedToJobNo && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Related To Job</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {relatedToJobNo}
                </div>
              </div>
            )}

            {job.remarks && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Remarks</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {job.remarks}
                </div>
              </div>
            )}

            {job.specialInstructions && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Special Instructions</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {job.specialInstructions}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
