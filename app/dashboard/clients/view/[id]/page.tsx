'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Client {
  _id: string;
  clientName: string;
  address?: string;
  emailAddress?: string;
  mobile: string;
  contactPerson?: string;
  department?: string;
  contactEmailAddress?: string;
  contactTelephone?: string;
}

export default function ViewClientPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && clientId) {
      fetchClient();
    }
  }, [user, clientId]);

  const fetchClient = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch client');
      }

      setClient(data.client);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch client');
      router.push('/dashboard/clients');
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
          <div className="text-lg">Loading client...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-red-600">Client not found</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">View Client</h1>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/clients/${clientId}`}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Edit
            </Link>
            <Link
              href="/dashboard/clients"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back
            </Link>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Client Name</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {client.clientName}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Mobile</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {client.mobile}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {client.address || '-'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {client.emailAddress || '-'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Person</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {client.contactPerson || '-'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Department</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {client.department || '-'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Email Address</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {client.contactEmailAddress || '-'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Telephone</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                {client.contactTelephone || '-'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
