'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { checkSession } = useAuth();
  const [checkingSession, setCheckingSession] = useState(false);

  const handleLoginClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setCheckingSession(true);
    
    try {
      const user = await checkSession();
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Session check error:', error);
      router.push('/login');
    } finally {
      setCheckingSession(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Welcome to PressERP
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Multi-Tenant ERP System for Printing Press Management
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleLoginClick}
            disabled={checkingSession}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {checkingSession ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Checking...
              </>
            ) : (
              'Login to Dashboard'
            )}
          </button>
          <a
            href="/register"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
          >
            Register as Admin
          </a>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2">Multi-Tenant</h3>
            <p className="text-gray-600 text-sm">
              Complete data isolation per company with secure tenant separation
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2">Comprehensive</h3>
            <p className="text-gray-600 text-sm">
              Manage clients, jobs, quotations, estimates, equipment and more
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2">BS Calendar</h3>
            <p className="text-gray-600 text-sm">
              Full Bikram Sambat date support for all date fields
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
