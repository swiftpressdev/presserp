'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Total Clients</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">24</div>
            <div className="mt-2 text-sm text-green-600">+12% from last month</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Active Jobs</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">18</div>
            <div className="mt-2 text-sm text-green-600">+8% from last month</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Quotations</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">32</div>
            <div className="mt-2 text-sm text-green-600">+15% from last month</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Estimates</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">27</div>
            <div className="mt-2 text-sm text-green-600">+10% from last month</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Activities
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    New quotation created
                  </div>
                  <div className="text-xs text-gray-500">2 hours ago</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-green-600 rounded-full" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    Job SWJ-045 completed
                  </div>
                  <div className="text-xs text-gray-500">5 hours ago</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-yellow-600 rounded-full" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    New client registered
                  </div>
                  <div className="text-xs text-gray-500">1 day ago</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Pending Deliveries
            </h2>
            <div className="space-y-4">
              <div className="border-l-4 border-red-500 pl-4 py-2">
                <div className="text-sm font-medium text-gray-900">Job SWJ-042</div>
                <div className="text-xs text-gray-500">Due: Today</div>
              </div>
              <div className="border-l-4 border-yellow-500 pl-4 py-2">
                <div className="text-sm font-medium text-gray-900">Job SWJ-043</div>
                <div className="text-xs text-gray-500">Due: Tomorrow</div>
              </div>
              <div className="border-l-4 border-green-500 pl-4 py-2">
                <div className="text-sm font-medium text-gray-900">Job SWJ-044</div>
                <div className="text-xs text-gray-500">Due: In 3 days</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
