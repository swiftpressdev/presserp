'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatBSDate } from '@/lib/dateUtils';
import { generateChallanReportPDF } from '@/lib/pdfUtils';

interface ChallanReportData {
  date: string;
  jobNo: string;
  challanNo: string;
  particulars: string;
  quantity: number;
  remarks?: string;
}

interface ChallanReport {
  _id: string;
  reportName: string;
  filterType: 'client' | 'particular';
  clientId?: { _id: string; clientName: string };
  particularName?: string;
  finalOrder: number;
  totalIssued: number;
  reportData: ChallanReportData[];
  lastUpdated: Date;
}

export default function ViewChallanReportPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<ChallanReport | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [finalOrder, setFinalOrder] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && reportId) {
      fetchReport();
    }
  }, [user, reportId]);

  const fetchReport = async () => {
    try {
      const response = await fetch(`/api/challan-reports/${reportId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch report');
      }

      setReport(data.report);
      setFinalOrder(data.report.finalOrder || 0);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch report');
      router.push('/dashboard/challan-reports');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateData = async () => {
    if (!confirm('This will refresh the report data with the latest challans. Continue?')) {
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/challan-reports/${reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-data',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update report data');
      }

      toast.success('Report data updated successfully');
      setReport(data.report);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update report data');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveFinalOrder = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/challan-reports/${reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          finalOrder,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save final order');
      }

      toast.success('Final order saved successfully');
      setReport(data.report);
      setEditMode(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save final order');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!report) return;

    try {
      await generateChallanReportPDF({
        reportName: report.reportName,
        filterType: report.filterType,
        filterValue: report.filterType === 'client' 
          ? report.clientId?.clientName || 'N/A'
          : report.particularName || 'N/A',
        finalOrder: report.finalOrder,
        totalIssued: report.totalIssued,
        reportData: report.reportData,
        lastUpdated: new Date(report.lastUpdated).toLocaleDateString(),
      });
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
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
          <div className="text-lg">Loading report...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!report) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-red-600">Report not found</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{report.reportName}</h1>
          <div className="flex gap-2">
            <button
              onClick={handleUpdateData}
              disabled={updating}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Update Data'}
            </button>
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Export PDF
            </button>
            <Link
              href="/dashboard/challan-reports"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back
            </Link>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          {/* Report Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b">
            <div>
              <label className="block text-sm font-medium text-gray-700">Filter Type</label>
              <div className="mt-1 text-sm text-gray-900">
                {report.filterType === 'client' ? 'Client' : 'Particular'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Filter Value</label>
              <div className="mt-1 text-sm text-gray-900">
                {report.filterType === 'client' 
                  ? report.clientId?.clientName || 'N/A'
                  : report.particularName || 'N/A'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Last Updated</label>
              <div className="mt-1 text-sm text-gray-900">
                {new Date(report.lastUpdated).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Final Order and Total Issued */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Final Order
              </label>
              {editMode ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={finalOrder}
                    onChange={(e) => setFinalOrder(Number(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                  <button
                    onClick={handleSaveFinalOrder}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setFinalOrder(report.finalOrder || 0);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-gray-900">{report.finalOrder || 0}</div>
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Issued
              </label>
              <div className="text-2xl font-bold text-green-600">{report.totalIssued}</div>
            </div>
          </div>

          {/* Report Data Table */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Challan Details</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                      Job No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                      Challan No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                      Particulars
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {report.reportData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        No data found
                      </td>
                    </tr>
                  ) : (
                    report.reportData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                          {formatBSDate(item.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                          {item.jobNo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                          {item.challanNo}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-300">
                          {item.particulars}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {item.remarks || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
