'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { PaperType } from '@/lib/types';

interface Paper {
  _id: string;
  clientName: string;
  paperType: string;
  paperTypeOther?: string;
  paperSize: string;
  paperWeight: string;
  units: string;
  originalStock: number;
}

export default function PapersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchPapers();
    }
  }, [user]);

  const fetchPapers = async () => {
    try {
      const response = await fetch('/api/papers');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setPapers(data.papers);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch papers');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (paper: Paper) => {
    router.push(`/dashboard/papers/${paper._id}`);
  };

  const handleDelete = async (paperId: string, paperName: string) => {
    if (!confirm(`Are you sure you want to delete "${paperName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/papers/${paperId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete paper');
      }

      toast.success('Paper deleted successfully');
      fetchPapers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete paper');
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
          <h1 className="text-3xl font-bold text-gray-900">Papers</h1>
          <Link
            href="/dashboard/papers/create"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Add Paper
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading papers...</div>
        ) : papers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No papers found. Create your first paper.</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Units
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Original Stock
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {papers.map((paper) => (
                  <tr key={paper._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {paper.clientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {paper.paperType === 'Other' && paper.paperTypeOther
                        ? paper.paperTypeOther
                        : paper.paperType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {paper.paperSize}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {paper.paperWeight}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {paper.units}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {paper.originalStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Link
                        href={`/dashboard/papers/view/${paper._id}`}
                        className="text-green-600 hover:text-green-900"
                      >
                        View
                      </Link>
                      <Link
                        href={`/dashboard/papers/${paper._id}`}
                        className="text-blue-600 hover:text-blue-900 ml-4"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(paper._id, paper.clientName)}
                        className="text-red-600 hover:text-red-900 ml-4"
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
