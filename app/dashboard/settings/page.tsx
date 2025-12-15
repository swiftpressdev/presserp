'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Settings {
  quotationPrefix: string;
  jobPrefix: string;
  estimatePrefix: string;
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usersCount, setUsersCount] = useState(0);
  const [settings, setSettings] = useState<Settings>({
    quotationPrefix: 'Q',
    jobPrefix: 'J',
    estimatePrefix: 'E',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (!authLoading && user && user.role !== UserRole.ADMIN) {
      router.push('/dashboard');
      toast.error('Admin access required');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && user.role === UserRole.ADMIN) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSettings(data.settings);
      setUsersCount(data.usersCount || 0);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      toast.success('Settings updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetCounter = async (counterType: 'quotation' | 'job' | 'estimate') => {
    if (!confirm(`Are you sure you want to reset the ${counterType} counter? This will restart numbering from 001.`)) {
      return;
    }

    try {
      const response = await fetch('/api/settings/reset-counter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ counterType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset counter');
      }

      toast.success(data.message);
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset counter');
    }
  };

  if (authLoading || !user || user.role !== UserRole.ADMIN) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>

        {loading ? (
          <div className="text-center py-12">Loading settings...</div>
        ) : (
          <>
            {/* User Management Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
                <Link
                  href="/dashboard/users"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Manage Users
                </Link>
              </div>
              <p className="text-sm text-gray-600">
                Total Users: <span className="font-semibold">{usersCount}</span>
              </p>
            </div>

            {/* Serial Number Prefixes */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Serial Number Prefixes
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quotation Prefix
                    </label>
                    <input
                      type="text"
                      value={settings.quotationPrefix}
                      onChange={(e) =>
                        setSettings({ ...settings, quotationPrefix: e.target.value })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., SWQ"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Example: {settings.quotationPrefix}-001
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Prefix
                    </label>
                    <input
                      type="text"
                      value={settings.jobPrefix}
                      onChange={(e) =>
                        setSettings({ ...settings, jobPrefix: e.target.value })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., SWJ"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Example: {settings.jobPrefix}-001
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimate Prefix
                    </label>
                    <input
                      type="text"
                      value={settings.estimatePrefix}
                      onChange={(e) =>
                        setSettings({ ...settings, estimatePrefix: e.target.value })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., SWE"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Example: {settings.estimatePrefix}-001
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Prefixes'}
                </button>
              </div>
            </div>

            {/* Reset Counters */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Reset Serial Numbers
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Reset counters to restart numbering from 001. This action cannot be undone.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-300 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Quotation Counter</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Restart quotation numbering
                  </p>
                  <button
                    onClick={() => handleResetCounter('quotation')}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    Reset Quotation
                  </button>
                </div>

                <div className="border border-gray-300 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Job Counter</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Restart job numbering
                  </p>
                  <button
                    onClick={() => handleResetCounter('job')}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    Reset Job
                  </button>
                </div>

                <div className="border border-gray-300 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Estimate Counter</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Restart estimate numbering
                  </p>
                  <button
                    onClick={() => handleResetCounter('estimate')}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    Reset Estimate
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
