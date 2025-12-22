'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface DefaultParticular {
  particularName: string;
  unit: string;
  quantity: number;
  rate: number;
}

interface Settings {
  quotationPrefix: string;
  jobPrefix: string;
  estimatePrefix: string;
  challanPrefix: string;
  companyName?: string;
  address?: string;
  email?: string;
  phone?: string;
  regdNo?: string;
  companyLogo?: string;
  companyStamp?: string;
  letterhead?: string;
  esignature?: string;
  companyLogoUseIn?: string[];
  companyStampUseIn?: string[];
  letterheadUseIn?: string[];
  esignatureUseIn?: string[];
  defaultParticulars?: DefaultParticular[];
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
    challanPrefix: 'C',
    companyName: '',
    address: '',
    email: '',
    phone: '',
    regdNo: '',
    companyLogo: '',
    companyStamp: '',
    letterhead: '',
    esignature: '',
    companyLogoUseIn: [],
    companyStampUseIn: [],
    letterheadUseIn: [],
    esignatureUseIn: [],
    defaultParticulars: [],
  });
  const [originalSettings, setOriginalSettings] = useState<Settings | null>(null);
  const [pendingFiles, setPendingFiles] = useState<{
    [key: string]: File | null;
  }>({});
  const [filePreviews, setFilePreviews] = useState<{
    [key: string]: string | null;
  }>({});
  const [uploading, setUploading] = useState<{
    [key: string]: boolean;
  }>({});
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetCounterType, setResetCounterType] = useState<'quotation' | 'job' | 'estimate' | 'challan' | null>(null);
  const [startingNumber, setStartingNumber] = useState<string>('0');
  const [resetting, setResetting] = useState(false);

  // Cache configuration
  const CACHE_KEY = 'presserp_settings_cache';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

  // Clear cache on component unmount or before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (typeof window !== 'undefined' && 'sessionStorage' in window) {
        sessionStorage.removeItem(CACHE_KEY);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(filePreviews).forEach((url) => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [filePreviews]);

  const fetchSettings = async (forceRefresh = false) => {
    try {
      // Check cache first (only if not forcing refresh)
      if (!forceRefresh && typeof window !== 'undefined' && 'sessionStorage' in window) {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const { data, timestamp } = JSON.parse(cached);
            // Check if cache is still valid
            if (Date.now() - timestamp < CACHE_DURATION) {
              setSettings(data.settings);
              setUsersCount(data.usersCount || 0);
              setLoading(false);
              return;
            }
          } catch (e) {
            // Invalid cache, continue to fetch
            sessionStorage.removeItem(CACHE_KEY);
          }
        }
      }

      const response = await fetch('/api/settings');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      // Cache the response
      if (typeof window !== 'undefined' && 'sessionStorage' in window) {
        sessionStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data,
            timestamp: Date.now(),
          })
        );
      }

      setSettings(data.settings);
      setOriginalSettings(data.settings); // Store original for change detection
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
      // Start with current settings (includes all fields including asset usage preferences)
      const updatedSettings = { ...settings };
      
      // First, upload all pending files and update URLs
      for (const [assetType, file] of Object.entries(pendingFiles)) {
        if (file) {
          setUploading({ ...uploading, [assetType]: true });
          
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('assetType', assetType === 'letterhead' ? 'letterhead' : assetType);

            const uploadResponse = await fetch('/api/settings/upload-asset', {
              method: 'POST',
              body: formData,
            });

            const uploadData = await uploadResponse.json();

            if (!uploadResponse.ok) {
              throw new Error(uploadData.error || `Failed to upload ${assetType}`);
            }

            // Update settings with the new URL
            updatedSettings[assetType as keyof Settings] = uploadData.url;
            
            toast.success(`${assetType.replace(/([A-Z])/g, ' $1').trim()} uploaded successfully`);
          } catch (error: any) {
            toast.error(error.message || `Failed to upload ${assetType}`);
            setUploading({ ...uploading, [assetType]: false });
            setSaving(false);
            return; // Stop if any upload fails
          } finally {
            setUploading({ ...uploading, [assetType]: false });
          }
        }
      }

      // Clear pending files after successful uploads
      setPendingFiles({});
      setFilePreviews({});

      // Save all settings (updatedSettings already includes asset usage preferences from settings state)
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      // Invalidate cache after successful update
      if (typeof window !== 'undefined' && 'sessionStorage' in window) {
        sessionStorage.removeItem(CACHE_KEY);
      }

      // Refresh settings to get latest data
      await fetchSettings(true);

      toast.success('Settings updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  // Check if there are any unsaved changes
  const hasUnsavedChanges = () => {
    if (!originalSettings) return false;
    
    // Check for pending files
    if (Object.values(pendingFiles).some(f => f !== null)) return true;
    
    // Deep compare settings with original
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };

  // Handle default particulars
  const addDefaultParticular = () => {
    const newParticular: DefaultParticular = {
      particularName: '',
      unit: '',
      quantity: 0,
      rate: 0,
    };
    setSettings({
      ...settings,
      defaultParticulars: [...(settings.defaultParticulars || []), newParticular],
    });
  };

  const removeDefaultParticular = (index: number) => {
    const updated = (settings.defaultParticulars || []).filter((_, i) => i !== index);
    setSettings({ ...settings, defaultParticulars: updated });
  };

  const updateDefaultParticular = (
    index: number,
    field: keyof DefaultParticular,
    value: string | number
  ) => {
    const updated = [...(settings.defaultParticulars || [])];
    if (field === 'quantity' || field === 'rate') {
      const numValue = value === '' || value === null || value === undefined ? 0 : Number(value);
      updated[index] = { ...updated[index], [field]: numValue };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setSettings({ ...settings, defaultParticulars: updated });
  };

  const handleAssetSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    assetType: 'companyLogo' | 'companyStamp' | 'letterhead' | 'esignature'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only image files are allowed (JPEG, PNG, WebP, GIF)');
      e.target.value = '';
      return;
    }

    // Validate file size
    const maxSize = assetType === 'letterhead' ? 5 * 1024 * 1024 : 1 * 1024 * 1024; // 5MB for letterhead, 1MB for others
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      toast.error(`File size exceeds maximum allowed size of ${maxSizeMB}MB`);
      e.target.value = '';
      return;
    }

    // Store file for later upload
    setPendingFiles({ ...pendingFiles, [assetType]: file });

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setFilePreviews({ ...filePreviews, [assetType]: previewUrl });

    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const handleRemovePendingFile = (assetType: 'companyLogo' | 'companyStamp' | 'letterhead' | 'esignature') => {
    // Revoke preview URL to free memory
    if (filePreviews[assetType]) {
      URL.revokeObjectURL(filePreviews[assetType]!);
    }
    
    setPendingFiles({ ...pendingFiles, [assetType]: null });
    setFilePreviews({ ...filePreviews, [assetType]: null });
  };

  const handleDeleteAsset = async (assetType: 'companyLogo' | 'companyStamp' | 'letterhead' | 'esignature') => {
    if (!confirm(`Are you sure you want to delete the ${assetType.replace(/([A-Z])/g, ' $1').trim()}? This action cannot be undone.`)) {
      return;
    }

    setUploading({ ...uploading, [assetType]: true });

    try {
      const response = await fetch(`/api/settings/upload-asset?assetType=${assetType}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete asset');
      }

      // Update settings to remove the asset URL
      setSettings({ ...settings, [assetType]: '' });
      
      // Invalidate cache after successful deletion
      if (typeof window !== 'undefined' && 'sessionStorage' in window) {
        sessionStorage.removeItem(CACHE_KEY);
      }

      toast.success(`${assetType.replace(/([A-Z])/g, ' $1').trim()} deleted successfully`);
      
      // Refresh settings to get latest data
      await fetchSettings(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete asset');
    } finally {
      setUploading({ ...uploading, [assetType]: false });
    }
  };

  const handleAssetUsageToggle = (
    assetType: 'companyLogo' | 'companyStamp' | 'letterhead' | 'esignature',
    documentType: 'Quotation' | 'Job' | 'Estimate' | 'Challan'
  ) => {
    const useInField = `${assetType}UseIn` as keyof Settings;
    const currentUseIn = (settings[useInField] as string[]) || [];
    
    const newUseIn = currentUseIn.includes(documentType)
      ? currentUseIn.filter(type => type !== documentType)
      : [...currentUseIn, documentType];
    
    setSettings({ ...settings, [useInField]: newUseIn });
  };

  const handleResetCounterClick = (counterType: 'quotation' | 'job' | 'estimate' | 'challan') => {
    setResetCounterType(counterType);
    setStartingNumber('0');
    setShowResetModal(true);
  };

  const handleResetCounter = async () => {
    if (!resetCounterType) return;

    const startingNum = parseInt(startingNumber, 10);
    if (isNaN(startingNum) || startingNum < 0) {
      toast.error('Please enter a valid starting number (0 or greater)');
      return;
    }

    setResetting(true);
    try {
      const response = await fetch('/api/settings/reset-counter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          counterType: resetCounterType,
          startingNumber: startingNum,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset counter');
      }

      // Invalidate cache after successful reset
      if (typeof window !== 'undefined' && 'sessionStorage' in window) {
        sessionStorage.removeItem(CACHE_KEY);
      }

      toast.success(data.message);
      setShowResetModal(false);
      setResetCounterType(null);
      setStartingNumber('0');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset counter');
    } finally {
      setResetting(false);
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

            {/* Company Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Company Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={settings.companyName || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, companyName: e.target.value })
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter company name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    value={settings.address || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, address: e.target.value })
                    }
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter company address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={settings.email || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, email: e.target.value })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={settings.phone || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, phone: e.target.value })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={settings.regdNo || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, regdNo: e.target.value })
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter registration number"
                  />
                </div>
              </div>
            </div>

            {/* Company Assets */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Company Assets
              </h2>
              <div className="space-y-6">
                {/* Company Logo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Logo
                  </label>
                  <div className="flex items-center gap-4">
                    {(filePreviews.companyLogo || settings.companyLogo) && (
                      <div className="relative">
                        <img
                          src={filePreviews.companyLogo || settings.companyLogo}
                          alt="Company Logo"
                          className="w-32 h-32 object-contain border border-gray-300 rounded"
                        />
                        {filePreviews.companyLogo ? (
                          <button
                            type="button"
                            onClick={() => handleRemovePendingFile('companyLogo')}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                            title="Remove pending file"
                          >
                            ×
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteAsset('companyLogo')}
                            disabled={uploading.companyLogo}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 disabled:opacity-50"
                            title="Delete asset"
                          >
                            {uploading.companyLogo ? '...' : '×'}
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAssetSelect(e, 'companyLogo')}
                        disabled={saving || uploading.companyLogo}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Max size: 1MB. Images only (JPEG, PNG, WebP, GIF). File will be uploaded when you save.
                      </p>
                      {pendingFiles.companyLogo && (
                        <p className="mt-1 text-xs text-blue-600 font-medium">
                          ✓ File selected (will be uploaded on save)
                        </p>
                      )}
                      
                      {(settings.companyLogo || pendingFiles.companyLogo) && (
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            Use Asset In:
                          </label>
                          <div className="flex flex-wrap gap-3">
                            {['Quotation', 'Job', 'Estimate', 'Challan'].map((docType) => (
                              <label key={docType} className="flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={(settings.companyLogoUseIn || []).includes(docType)}
                                  onChange={() => handleAssetUsageToggle('companyLogo', docType as any)}
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs text-gray-700">{docType}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Company Stamp */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Stamp
                  </label>
                  <div className="flex items-center gap-4">
                    {(filePreviews.companyStamp || settings.companyStamp) && (
                      <div className="relative">
                        <img
                          src={filePreviews.companyStamp || settings.companyStamp}
                          alt="Company Stamp"
                          className="w-32 h-32 object-contain border border-gray-300 rounded"
                        />
                        {filePreviews.companyStamp ? (
                          <button
                            type="button"
                            onClick={() => handleRemovePendingFile('companyStamp')}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                            title="Remove pending file"
                          >
                            ×
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteAsset('companyStamp')}
                            disabled={uploading.companyStamp}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 disabled:opacity-50"
                            title="Delete asset"
                          >
                            {uploading.companyStamp ? '...' : '×'}
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAssetSelect(e, 'companyStamp')}
                        disabled={saving || uploading.companyStamp}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Max size: 1MB. Images only (JPEG, PNG, WebP, GIF). File will be uploaded when you save.
                      </p>
                      {pendingFiles.companyStamp && (
                        <p className="mt-1 text-xs text-blue-600 font-medium">
                          ✓ File selected (will be uploaded on save)
                        </p>
                      )}
                      
                      {(settings.companyStamp || pendingFiles.companyStamp) && (
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            Use Asset In:
                          </label>
                          <div className="flex flex-wrap gap-3">
                            {['Quotation', 'Job', 'Estimate', 'Challan'].map((docType) => (
                              <label key={docType} className="flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={(settings.companyStampUseIn || []).includes(docType)}
                                  onChange={() => handleAssetUsageToggle('companyStamp', docType as any)}
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs text-gray-700">{docType}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Letterhead */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Letterhead
                  </label>
                  <div className="flex items-center gap-4">
                    {(filePreviews.letterhead || settings.letterhead) && (
                      <div className="relative">
                        <img
                          src={filePreviews.letterhead || settings.letterhead}
                          alt="Letterhead"
                          className="w-32 h-32 object-contain border border-gray-300 rounded"
                        />
                        {filePreviews.letterhead ? (
                          <button
                            type="button"
                            onClick={() => handleRemovePendingFile('letterhead')}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                            title="Remove pending file"
                          >
                            ×
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteAsset('letterhead')}
                            disabled={uploading.letterhead}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 disabled:opacity-50"
                            title="Delete asset"
                          >
                            {uploading.letterhead ? '...' : '×'}
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAssetSelect(e, 'letterhead')}
                        disabled={saving || uploading.letterhead}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Max size: 5MB. Images only (JPEG, PNG, WebP, GIF). File will be uploaded when you save.
                      </p>
                      {pendingFiles.letterhead && (
                        <p className="mt-1 text-xs text-blue-600 font-medium">
                          ✓ File selected (will be uploaded on save)
                        </p>
                      )}
                      
                      {(settings.letterhead || pendingFiles.letterhead) && (
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            Use Asset In (Letterhead as background):
                          </label>
                          <div className="flex flex-wrap gap-3">
                            {['Quotation', 'Job', 'Estimate', 'Challan'].map((docType) => (
                              <label key={docType} className="flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={(settings.letterheadUseIn || []).includes(docType)}
                                  onChange={() => handleAssetUsageToggle('letterhead', docType as any)}
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs text-gray-700">{docType}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* E-Signature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-Signature
                  </label>
                  <div className="flex items-center gap-4">
                    {(filePreviews.esignature || settings.esignature) && (
                      <div className="relative">
                        <img
                          src={filePreviews.esignature || settings.esignature}
                          alt="E-Signature"
                          className="w-32 h-32 object-contain border border-gray-300 rounded"
                        />
                        {filePreviews.esignature ? (
                          <button
                            type="button"
                            onClick={() => handleRemovePendingFile('esignature')}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                            title="Remove pending file"
                          >
                            ×
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteAsset('esignature')}
                            disabled={uploading.esignature}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 disabled:opacity-50"
                            title="Delete asset"
                          >
                            {uploading.esignature ? '...' : '×'}
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAssetSelect(e, 'esignature')}
                        disabled={saving || uploading.esignature}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Max size: 1MB. Images only (JPEG, PNG, WebP, GIF). File will be uploaded when you save.
                      </p>
                      {pendingFiles.esignature && (
                        <p className="mt-1 text-xs text-blue-600 font-medium">
                          ✓ File selected (will be uploaded on save)
                        </p>
                      )}
                      
                      {(settings.esignature || pendingFiles.esignature) && (
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            Use Asset In:
                          </label>
                          <div className="flex flex-wrap gap-3">
                            {['Quotation', 'Job', 'Estimate', 'Challan'].map((docType) => (
                              <label key={docType} className="flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={(settings.esignatureUseIn || []).includes(docType)}
                                  onChange={() => handleAssetUsageToggle('esignature', docType as any)}
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs text-gray-700">{docType}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Serial Number Prefixes */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Serial Number Prefixes
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Challan Prefix
                    </label>
                    <input
                      type="text"
                      value={settings.challanPrefix}
                      onChange={(e) =>
                        setSettings({ ...settings, challanPrefix: e.target.value })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., C"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Example: {settings.challanPrefix}-001
                    </p>
                  </div>
                </div>
                  </div>
                </div>

            {/* Default Particulars */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Default Particulars
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Set default particulars that can be quickly added to estimates and quotations.
              </p>

              {settings.defaultParticulars && settings.defaultParticulars.length > 0 ? (
                <div className="overflow-x-auto mb-4">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-left">Particular Name</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Unit</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Quantity</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Rate</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settings.defaultParticulars.map((particular, index) => (
                        <tr key={index}>
                          <td className="border border-gray-300 px-4 py-2">
                            <input
                              type="text"
                              value={particular.particularName}
                              onChange={(e) =>
                                updateDefaultParticular(index, 'particularName', e.target.value)
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter particular name"
                            />
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <input
                              type="text"
                              value={particular.unit}
                              onChange={(e) =>
                                updateDefaultParticular(index, 'unit', e.target.value)
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholder="e.g., pcs, box"
                            />
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <input
                              type="number"
                              value={particular.quantity === 0 ? '' : particular.quantity}
                              onChange={(e) =>
                                updateDefaultParticular(index, 'quantity', e.target.value)
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              min="0"
                              step="0.01"
                              placeholder="0"
                            />
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <input
                              type="number"
                              value={particular.rate === 0 ? '' : particular.rate}
                              onChange={(e) =>
                                updateDefaultParticular(index, 'rate', e.target.value)
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeDefaultParticular(index)}
                              className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-4 italic">
                  No default particulars added yet. Click below to add your first one.
                </p>
              )}

              <button
                type="button"
                onClick={addDefaultParticular}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
              >
                Add Default Particular
              </button>
            </div>

            {/* Consolidated Save Button */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {hasUnsavedChanges() ? 'You have unsaved changes' : 'All settings saved'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {hasUnsavedChanges()
                      ? 'Click the button to save all changes made to company information, assets, prefixes, and default particulars.'
                      : 'All your settings are up to date.'}
                  </p>
                </div>
                <button
                  onClick={handleSaveSettings}
                  disabled={saving || Object.values(uploading).some(v => v) || !hasUnsavedChanges()}
                  className="px-8 py-3 text-base font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {saving ? 'Saving All Settings...' : 'Save All Settings'}
                </button>
              </div>
            </div>

            {/* Reset Counters */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Reset Serial Numbers
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Reset counters to restart numbering from a specific number. This action cannot be undone.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="border border-gray-300 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Quotation Counter</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Restart quotation numbering
                  </p>
                  <button
                    onClick={() => handleResetCounterClick('quotation')}
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
                    onClick={() => handleResetCounterClick('job')}
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
                    onClick={() => handleResetCounterClick('estimate')}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    Reset Estimate
                  </button>
                </div>

                <div className="border border-gray-300 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Challan Counter</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Restart challan numbering
                  </p>
                  <button
                    onClick={() => handleResetCounterClick('challan')}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    Reset Challan
                  </button>
                </div>
              </div>
            </div>

            {/* Reset Counter Modal */}
            {showResetModal && resetCounterType && (
              <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                  <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Reset {resetCounterType.charAt(0).toUpperCase() + resetCounterType.slice(1)} Counter
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">
                      Enter the starting number for the counter. The next number generated will be this value.
                      Leave as 0 to start from 001.
                    </p>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Starting Number
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="999999"
                        value={startingNumber === '' || startingNumber === '0' ? '' : startingNumber}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                            setStartingNumber(value);
                          }
                        }}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Example: Enter 100 to start from{' '}
                        {resetCounterType === 'quotation'
                          ? `${settings.quotationPrefix}-100`
                          : resetCounterType === 'job'
                          ? `${settings.jobPrefix}-100`
                          : resetCounterType === 'estimate'
                          ? `${settings.estimatePrefix}-100`
                          : `${settings.challanPrefix}-100`}
                      </p>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowResetModal(false);
                          setResetCounterType(null);
                          setStartingNumber('0');
                        }}
                        disabled={resetting}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleResetCounter}
                        disabled={resetting}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        {resetting ? 'Resetting...' : 'Reset Counter'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
