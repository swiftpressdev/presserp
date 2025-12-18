'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/lib/types';

interface User {
  id: string;
  email: string;
  role: UserRole;
  adminId?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkSession = async (): Promise<User | null> => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      });
      
      // Session endpoint now always returns 200, so check the authenticated flag
      const data = await response.json();
      
      if (data.authenticated) {
        setUser(data.user);
        return data.user;
      } else {
        // Token expired or invalid - clear user
        setUser(null);
        return null;
      }
    } catch (error) {
      // Network errors - don't clear user, might be temporary
      console.error('Session check failed:', error);
      // Return current user state to avoid unnecessary logout
      return user;
    }
  };

  useEffect(() => {
    const initSession = async () => {
      setLoading(true);
      await checkSession();
      setLoading(false);
    };
    initSession();
  }, []);

  // Set up periodic session check separately to avoid dependency issues
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      await checkSession();
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [user]);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setUser(data.user);
      router.push('/dashboard');
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
