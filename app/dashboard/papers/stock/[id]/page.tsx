'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatBSDate, getCurrentBSDate } from '@/lib/dateUtils';
import { generatePaperStockPDF } from '@/lib/pdfUtils';
import { generatePaperStockExcel } from '@/lib/excelUtils';

interface PaperStock {
  _id: string;
  date: string;
  jobNo?: string;
  jobName?: string;
  issuedPaper: number;
  wastage: number;
  addedStock?: number;
  remaining: number;
  remarks?: string;
}

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

export default function PaperStockPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const paperId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [paper, setPaper] = useState<Paper | null>(null);
  const [stockEntries, setStockEntries] = useState<PaperStock[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: getCurrentBSDate(),
    jobNo: '',
    jobName: '',
    issuedPaper: 0,
    wastage: 0,
    remarks: '',
  });
  const [addStockFormData, setAddStockFormData] = useState({
    date: getCurrentBSDate(),
    addedStock: 0,
    remarks: '',
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddStockForm, setShowAddStockForm] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && paperId) {
      fetchData();
    }
  }, [user, paperId]);

  const fetchData = async () => {
    try {
      const [paperRes, stockRes] = await Promise.all([
        fetch(`/api/papers/${paperId}`),
        fetch(`/api/paper-stock?paperId=${paperId}`),
      ]);

      const [paperData, stockData] = await Promise.all([
        paperRes.json(),
        stockRes.json(),
      ]);

      if (!paperRes.ok) {
        throw new Error(paperData.error || 'Failed to fetch paper');
      }

      if (!stockRes.ok) {
        throw new Error(stockData.error || 'Failed to fetch stock');
      }

      setPaper(paperData.paper);
      setStockEntries(stockData.stockEntries || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch data');
      router.push('/dashboard/papers');
    } finally {
      setLoading(false);
    }
  };

  const calculateRemaining = (entryIndex: number) => {
    if (entryIndex === 0) {
      return (paper?.originalStock || 0) - formData.issuedPaper - formData.wastage;
    }
    const previousRemaining = stockEntries[entryIndex - 1].remaining;
    return previousRemaining - formData.issuedPaper - formData.wastage;
  };

  const calculateRemainingForAddStock = (entryIndex: number) => {
    if (entryIndex === 0) {
      return (paper?.originalStock || 0) + addStockFormData.addedStock;
    }
    const previousRemaining = stockEntries[entryIndex - 1].remaining;
    return previousRemaining + addStockFormData.addedStock;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const remaining = editingId 
      ? calculateRemaining(stockEntries.findIndex(s => s._id === editingId))
      : calculateRemaining(stockEntries.length);

    try {
      const url = editingId 
        ? `/api/paper-stock/${editingId}`
        : '/api/paper-stock';
      
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paperId,
          ...formData,
          remaining,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save stock entry');
      }

      toast.success(editingId ? 'Stock entry updated successfully' : 'Stock entry added successfully');
      setShowAddForm(false);
      setEditingId(null);
      setFormData({
        date: getCurrentBSDate(),
        jobNo: '',
        jobName: '',
        issuedPaper: 0,
        wastage: 0,
        remarks: '',
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save stock entry');
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (addStockFormData.addedStock <= 0) {
      toast.error('Added stock must be greater than 0');
      return;
    }

    const entryIndex = editingId ? stockEntries.findIndex(s => s._id === editingId) : stockEntries.length;
    const remaining = calculateRemainingForAddStock(entryIndex);

    try {
      const url = editingId 
        ? `/api/paper-stock/${editingId}`
        : '/api/paper-stock';
      
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paperId,
          date: addStockFormData.date,
          issuedPaper: 0,
          wastage: 0,
          addedStock: addStockFormData.addedStock,
          remaining,
          remarks: addStockFormData.remarks || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add stock');
      }

      toast.success(editingId ? 'Stock addition updated successfully' : 'Stock added successfully');
      setShowAddStockForm(false);
      setEditingId(null);
      setAddStockFormData({
        date: getCurrentBSDate(),
        addedStock: 0,
        remarks: '',
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add stock');
    }
  };

  const handleEdit = (entry: PaperStock) => {
    setEditingId(entry._id);
    if (entry.addedStock && entry.addedStock > 0) {
      // Editing an add stock entry
      setAddStockFormData({
        date: entry.date,
        addedStock: entry.addedStock,
        remarks: entry.remarks || '',
      });
      setShowAddStockForm(true);
    } else {
      // Editing a regular stock entry
      setFormData({
        date: entry.date,
        jobNo: entry.jobNo || '',
        jobName: entry.jobName || '',
        issuedPaper: entry.issuedPaper,
        wastage: entry.wastage,
        remarks: entry.remarks || '',
      });
      setShowAddForm(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stock entry?')) {
      return;
    }

    try {
      const response = await fetch(`/api/paper-stock/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete stock entry');
      }

      toast.success('Stock entry deleted successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete stock entry');
    }
  };

  const handleExportPDF = async () => {
    if (!paper) return;

    try {
      await generatePaperStockPDF({
        paper: {
          clientName: paper.clientName,
          paperType: paper.paperType === 'Other' && paper.paperTypeOther ? paper.paperTypeOther : paper.paperType,
          paperSize: paper.paperSize,
          paperWeight: paper.paperWeight,
          units: paper.units,
          originalStock: paper.originalStock,
        },
        stockEntries: stockEntries.map(entry => ({
          date: entry.date,
          jobNo: entry.jobNo,
          jobName: entry.jobName,
          issuedPaper: entry.issuedPaper,
          wastage: entry.wastage,
          addedStock: entry.addedStock,
          remaining: entry.remaining,
          remarks: entry.remarks,
        })),
      });
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  const handleExportExcel = () => {
    if (!paper) return;

    try {
      generatePaperStockExcel({
        paper: {
          clientName: paper.clientName,
          paperType: paper.paperType === 'Other' && paper.paperTypeOther ? paper.paperTypeOther : paper.paperType,
          paperSize: paper.paperSize,
          paperWeight: paper.paperWeight,
          units: paper.units,
          originalStock: paper.originalStock,
        },
        stockEntries: stockEntries.map(entry => ({
          date: entry.date,
          jobNo: entry.jobNo,
          jobName: entry.jobName,
          issuedPaper: entry.issuedPaper,
          wastage: entry.wastage,
          addedStock: entry.addedStock,
          remaining: entry.remaining,
          remarks: entry.remarks,
        })),
      });
      toast.success('Excel exported successfully');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export Excel');
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
          <div className="text-lg">Loading stock...</div>
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

  const currentRemaining = stockEntries.length > 0 
    ? stockEntries[stockEntries.length - 1].remaining 
    : paper.originalStock;

  return (
    <DashboardLayout>
      <div className="max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Paper Stock - {paper.clientName}</h1>
          <div className="flex gap-2">
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Export PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              Export Excel
            </button>
            <button
              onClick={() => {
                setShowAddStockForm(!showAddStockForm);
                setShowAddForm(false);
                setEditingId(null);
                setAddStockFormData({
                  date: getCurrentBSDate(),
                  addedStock: 0,
                  remarks: '',
                });
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
            >
              {showAddStockForm ? 'Cancel' : 'Add Stock'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setShowAddStockForm(false);
                setEditingId(null);
                setFormData({
                  date: getCurrentBSDate(),
                  jobNo: '',
                  jobName: '',
                  issuedPaper: 0,
                  wastage: 0,
                  remarks: '',
                });
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              {showAddForm ? 'Cancel' : 'Add Entry'}
            </button>
            <Link
              href={`/dashboard/papers/view/${paperId}`}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back
            </Link>
          </div>
        </div>

        {/* Paper Info */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Paper Type</label>
              <div className="mt-1 text-sm text-gray-900">{paper.paperType === 'Other' && paper.paperTypeOther ? paper.paperTypeOther : paper.paperType}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Size</label>
              <div className="mt-1 text-sm text-gray-900">{paper.paperSize}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Weight</label>
              <div className="mt-1 text-sm text-gray-900">{paper.paperWeight}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Remaining</label>
              <div className="mt-1 text-lg font-bold text-green-600">{currentRemaining} {paper.units}</div>
            </div>
          </div>
        </div>

        {/* Add Stock Form */}
        {showAddStockForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Stock Addition' : 'Add New Stock'}
            </h2>
            <form onSubmit={handleAddStock} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date (BS) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addStockFormData.date}
                    onChange={(e) => setAddStockFormData({ ...addStockFormData, date: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Added Stock <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={addStockFormData.addedStock}
                    onChange={(e) => setAddStockFormData({ ...addStockFormData, addedStock: Number(e.target.value) })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Remarks</label>
                  <input
                    type="text"
                    value={addStockFormData.remarks}
                    onChange={(e) => setAddStockFormData({ ...addStockFormData, remarks: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                >
                  {editingId ? 'Update' : 'Add'} Stock
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStockForm(false);
                    setEditingId(null);
                    setAddStockFormData({
                      date: getCurrentBSDate(),
                      addedStock: 0,
                      remarks: '',
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Stock Entry' : 'Add Stock Entry'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date (BS) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Job No</label>
                  <input
                    type="text"
                    value={formData.jobNo}
                    onChange={(e) => setFormData({ ...formData, jobNo: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Job Name</label>
                  <input
                    type="text"
                    value={formData.jobName}
                    onChange={(e) => setFormData({ ...formData, jobName: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Issued Paper <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.issuedPaper}
                    onChange={(e) => setFormData({ ...formData, issuedPaper: Number(e.target.value) })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Wastage <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.wastage}
                    onChange={(e) => setFormData({ ...formData, wastage: Number(e.target.value) })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Remarks</label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  {editingId ? 'Update' : 'Add'} Entry
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                    setFormData({
                      date: getCurrentBSDate(),
                      jobNo: '',
                      jobName: '',
                      issuedPaper: 0,
                      wastage: 0,
                      remarks: '',
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stock Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
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
                  Job Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                  Issued Paper
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                  Wastage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                  Added Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                  Remaining
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remarks
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stockEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                    No stock entries found
                  </td>
                </tr>
              ) : (
                stockEntries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                      {formatBSDate(entry.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                      {entry.jobNo || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-300">
                      {entry.jobName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                      {entry.issuedPaper}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                      {entry.wastage}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 border-r border-gray-300">
                      {entry.addedStock && entry.addedStock > 0 ? `+${entry.addedStock}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 border-r border-gray-300">
                      {entry.remaining}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {entry.remarks || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm space-x-2">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry._id)}
                        className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
