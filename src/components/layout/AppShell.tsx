'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GlobalSearchModal } from './GlobalSearchModal';
import { getStoredToken } from '../../lib/api-client';
import { useRouter, usePathname } from 'next/navigation';
import { Zap } from 'lucide-react';

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isAuthPage = pathname === '/login' || pathname === '/register';
    const token = getStoredToken();

    if (!token && !isAuthPage) {
      window.location.replace(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
    } else {
      setIsAuthChecking(false);
    }
  }, [pathname]);

  // Loading skeleton while verifying session
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold animate-pulse shadow-md shadow-primary/20">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <p className="text-xs font-semibold text-slate-500 animate-pulse">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenSearch={() => setSearchOpen(true)} />
        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>

      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
