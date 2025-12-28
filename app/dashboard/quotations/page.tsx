'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import AdvancedSearchBar, { SearchField } from '@/components/AdvancedSearchBar';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { generateQuotationPDF } from '@/lib/pdfUtils';
import ParticularsTable, { Particular } from '@/components/ParticularsTable';

interface Quotation {
  _id: string;
  quotationSN: string;
  partyName: string;
  address: string;
  phoneNumber: string;
  particulars: any[];
  total: number;
  hasDiscount?: boolean;
  discountPercentage?: number;
  discountAmount?: number;
  priceAfterDiscount?: number;
  vatType: 'excluded' | 'included' | 'none';
  vatAmount?: number;
  grandTotal: number;
  amountInWords?: string;
  remarks?: string;
}

export default function QuotationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState<Record<string, any>>({});

  const searchFields: SearchField[] = [
    { key: 'quotationSN', label: 'Quotation No', type: 'text' },
    { key: 'partyName', label: 'Party Name', type: 'text' },
    { key: 'phoneNumber', label: 'Phone Number', type: 'text' },
    { key: 'address', label: 'Address', type: 'text' },
    {
      key: 'vatType',
      label: 'VAT Type',
      type: 'select',
      options: [
        { value: 'excluded', label: 'Excluded' },
        { value: 'included', label: 'Included' },
        { value: 'none', label: 'None' },
      ],
    },
    { key: 'grandTotal', label: 'Grand Total', type: 'numberRange' },
  ];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchQuotations();
    }
  }, [user]);

  const fetchQuotations = async () => {
    try {
      const response = await fetch('/api/quotations');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setQuotations(data.quotations);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch quotations');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async (quotation: Quotation) => {
    try {
      await generateQuotationPDF(quotation);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  const handleEdit = (quotation: Quotation) => {
    router.push(`/dashboard/quotations/${quotation._id}`);
  };

  const handleDelete = async (quotationId: string, quotationSN: string) => {
    if (!confirm(`Are you sure you want to delete quotation "${quotationSN}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/quotations/${quotationId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete quotation');
      }

      toast.success('Quotation deleted successfully');
      fetchQuotations();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete quotation');
    }
  };

  const handleSearch = (params: Record<string, any>) => {
    setSearchParams(params);
  };

  const handleReset = () => {
    setSearchParams({});
  };

  const filteredQuotations = useMemo(() => {
    if (Object.keys(searchParams).length === 0) {
      return quotations;
    }

    return quotations.filter((quotation) => {
      return Object.keys(searchParams).every((key) => {
        const searchValue = searchParams[key];
        if (!searchValue || (typeof searchValue === 'object' && Object.values(searchValue).every((v) => !v))) {
          return true;
        }

        if (key === 'grandTotal' && typeof searchValue === 'object') {
          const min = searchValue.min;
          const max = searchValue.max;
          const total = quotation.grandTotal;
          if (min !== undefined && min !== '' && total < Number(min)) return false;
          if (max !== undefined && max !== '' && total > Number(max)) return false;
          return true;
        }

        const quotationValue = (quotation as any)[key]?.toString().toLowerCase() || '';
        return quotationValue.includes(searchValue.toString().toLowerCase());
      });
    });
  }, [quotations, searchParams]);

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
          <h1 className="text-3xl font-bold text-gray-900">Quotations</h1>
          <Link
            href="/dashboard/quotations/create"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Create Quotation
          </Link>
        </div>

        {!loading && quotations.length > 0 && (
          <AdvancedSearchBar fields={searchFields} onSearch={handleSearch} onReset={handleReset} />
        )}

        {loading ? (
          <div className="text-center py-12">Loading quotations...</div>
        ) : filteredQuotations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">
              {quotations.length === 0
                ? 'No quotations found. Create your first quotation.'
                : 'No quotations match your search criteria.'}
            </p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quotation No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Party Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grand Total
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQuotations.map((quotation) => (
                  <tr key={quotation._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {quotation.quotationSN}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {quotation.partyName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {quotation.phoneNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {quotation.grandTotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm space-x-2">
                      <Link
                        href={`/dashboard/quotations/view/${quotation._id}`}
                        className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
                      >
                        View
                      </Link>
                      <Link
                        href={`/dashboard/quotations/${quotation._id}`}
                        className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleExportPDF(quotation)}
                        className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
                      >
                        Export PDF
                      </button>
                      <button
                        onClick={() => handleDelete(quotation._id, quotation.quotationSN)}
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
