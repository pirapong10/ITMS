'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GlobalSearchModal } from './GlobalSearchModal';
import { getStoredToken } from '../../lib/api-client';
import { useRouter, usePathname } from 'next/navigation';

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if on login or register page
    const isAuthPage = pathname === '/login' || pathname === '/register';
    const token = getStoredToken();

    if (!token && !isAuthPage) {
      // Allow viewing without blocking, or can redirect to /login
    }
  }, [pathname, router]);

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
