'use client';

import { useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';

interface MenuItem {
  name: string;
  path: string;
  adminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Clients', path: '/dashboard/clients' },
  { name: 'Papers', path: '/dashboard/papers' },
  { name: 'Quotation', path: '/dashboard/quotations' },
  { name: 'Jobs Creator', path: '/dashboard/jobs' },
  { name: 'Equipment', path: '/dashboard/equipment' },
  { name: 'Estimates', path: '/dashboard/estimates' },
  { name: 'Challan', path: '/dashboard/challans' },
  { name: 'Challan Reports', path: '/dashboard/challan-reports' },
  { name: 'Settings', path: '/dashboard/settings', adminOnly: true },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const filteredMenuItems = menuItems.filter(
    (item) => !item.adminOnly || user?.role === UserRole.ADMIN
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-30">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {sidebarOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">PressERP</h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-20 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <nav className="p-4 space-y-1">
          {filteredMenuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`block px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="pt-16 lg:pl-64">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
