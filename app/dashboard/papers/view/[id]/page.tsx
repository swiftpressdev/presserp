'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { PaperType } from '@/lib/types';

interface Paper {
  _id: string;
  paperName: string;
  paperType: string;
  paperTypeOther?: string;
  paperSize: string;
  paperWeight: string;
}

export default function ViewPaperPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const paperId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [paper, setPaper] = useState<Paper | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && paperId) {
      fetchPaper();
    }
  }, [user, paperId]);

  const fetchPaper = async () => {
    try {
      const response = await fetch(`/api/papers/${paperId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch paper');
      }

      setPaper(data.paper);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch paper');
      router.push('/dashboard/papers');
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
          <div className="text-lg">Loading paper...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!paper) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-red-600">Paper not found</div>
        </div>
      </DashboardLayout>
    );
  }

  const displayPaperType = paper.paperType === PaperType.OTHERS && paper.paperTypeOther
    ? paper.paperTypeOther
    : paper.paperType;

  return (
    <DashboardLayout>
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">View Paper</h1>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/papers/${paperId}`}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Edit
            </Link>
            <Link
              href="/dashboard/papers"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back
            </Link>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Paper Name</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {paper.paperName}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Paper Type</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {displayPaperType}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Paper Size</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {paper.paperSize}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Paper Weight</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {paper.paperWeight}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
