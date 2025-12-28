'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import AdvancedSearchBar, { SearchField } from '@/components/AdvancedSearchBar';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatBSDate } from '@/lib/dateUtils';

interface ChallanReport {
  _id: string;
  reportName: string;
  filterType: 'client' | 'particular';
  clientId?: { _id: string; clientName: string };
  particularName?: string;
  finalOrder?: number;
  totalIssued: number;
  lastUpdated: Date;
}

export default function ChallanReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<ChallanReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState<Record<string, any>>({});

  const searchFields: SearchField[] = [
    { key: 'reportName', label: 'Report Name', type: 'text' },
    {
      key: 'filterType',
      label: 'Filter Type',
      type: 'select',
      options: [
        { value: 'client', label: 'Client' },
        { value: 'particular', label: 'Particular' },
      ],
    },
    { key: 'clientName', label: 'Client Name', type: 'text' },
    { key: 'particularName', label: 'Particular Name', type: 'text' },
    { key: 'totalIssued', label: 'Total Issued', type: 'numberRange' },
    { key: 'finalOrder', label: 'Final Order', type: 'numberRange' },
  ];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user]);

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/challan-reports');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setReports(data.reports);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch challan reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reportId: string, reportName: string) => {
    if (!confirm(`Are you sure you want to delete report "${reportName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/challan-reports/${reportId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete report');
      }

      toast.success('Report deleted successfully');
      fetchReports();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete report');
    }
  };

  const handleSearch = (params: Record<string, any>) => {
    setSearchParams(params);
  };

  const handleReset = () => {
    setSearchParams({});
  };

  const filteredReports = useMemo(() => {
    if (Object.keys(searchParams).length === 0) {
      return reports;
    }

    return reports.filter((report) => {
      return Object.keys(searchParams).every((key) => {
        const searchValue = searchParams[key];
        if (!searchValue || (typeof searchValue === 'object' && Object.values(searchValue).every((v) => !v))) {
          return true;
        }

        if ((key === 'totalIssued' || key === 'finalOrder') && typeof searchValue === 'object') {
          const min = searchValue.min;
          const max = searchValue.max;
          const reportValue = (report as any)[key] || 0;
          if (min !== undefined && min !== '' && reportValue < Number(min)) return false;
          if (max !== undefined && max !== '' && reportValue > Number(max)) return false;
          return true;
        }

        if (key === 'clientName') {
          const clientName = report.clientId?.clientName || '';
          return clientName.toLowerCase().includes(searchValue.toString().toLowerCase());
        }

        const reportValue = (report as any)[key]?.toString().toLowerCase() || '';
        return reportValue.includes(searchValue.toString().toLowerCase());
      });
    });
  }, [reports, searchParams]);

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
          <h1 className="text-3xl font-bold text-gray-900">Challan Reports</h1>
          <Link
            href="/dashboard/challan-reports/create"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Create Report
          </Link>
        </div>

        {!loading && reports.length > 0 && (
          <AdvancedSearchBar fields={searchFields} onSearch={handleSearch} onReset={handleReset} />
        )}

        {loading ? (
          <div className="text-center py-12">Loading reports...</div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">
              {reports.length === 0
                ? 'No reports found. Create your first challan report.'
                : 'No reports match your search criteria.'}
            </p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Filter Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Filter Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Final Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Issued
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {report.reportName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.filterType === 'client' ? 'Client' : 'Particular'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.filterType === 'client' 
                        ? (report.clientId?.clientName || 'N/A')
                        : (report.particularName || 'N/A')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.finalOrder || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.totalIssued}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(report.lastUpdated).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm space-x-2">
                      <Link
                        href={`/dashboard/challan-reports/view/${report._id}`}
                        className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDelete(report._id, report.reportName)}
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
