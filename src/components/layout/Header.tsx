'use client';

import React, { useState, useEffect } from 'react';
import { Search, Bell, Globe, User, LogOut, ChevronDown, ShieldCheck, Building2 } from 'lucide-react';
import { getStoredUser, clearSession, getStoredTenantId, setStoredTenantId } from '../../lib/api-client';
import { useRouter } from 'next/navigation';

export interface HeaderProps {
  onOpenSearch: () => void;
}

export function Header({ onOpenSearch }: HeaderProps) {
  const [user, setUser] = useState<any>(null);
  const [tenantId, setTenantIdState] = useState('tenant-default');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setUser(getStoredUser());
    setTenantIdState(getStoredTenantId());
  }, []);

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  const handleTenantChange = (newTenant: string) => {
    setStoredTenantId(newTenant);
    setTenantIdState(newTenant);
    window.location.reload();
  };

  return (
    <header className="h-14 bg-surface border-b border-border px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Quick Search Bar trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/80 hover:bg-slate-200/70 text-slate-500 text-xs transition-all border border-border/60 w-52 sm:w-72 justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">ค้นหาทั่วระบบ...</span>
          </div>
          <kbd className="hidden sm:inline-block text-[10px] bg-white border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded font-mono shadow-xs">
            ⌘K
          </kbd>
        </button>

        {/* Tenant Selector Tag */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-border">
          <Building2 className="w-3.5 h-3.5 text-primary" />
          <span className="font-semibold text-dark">{tenantId}</span>
        </div>
      </div>

      {/* Right: Actions, Language/Currency & User Menu */}
      <div className="flex items-center gap-2.5">
        {/* Language & Currency Pill */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-border">
          <Globe className="w-3 h-3 text-slate-400" />
          <span>TH / THB ฿</span>
        </div>

        {/* Notification Bell */}
        <button className="p-2 rounded-lg text-slate-500 hover:text-dark hover:bg-slate-100 transition-all relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-white" />
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
            </div>
            <div className="hidden md:block text-left text-xs leading-tight">
              <div className="font-semibold text-dark truncate max-w-[120px]">{user?.name || 'Administrator'}</div>
              <div className="text-[10px] text-slate-400 capitalize">{user?.role || 'Super Admin'}</div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-2 border-b border-border">
                <p className="text-xs font-bold text-dark">{user?.name || 'Administrator'}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email || 'admin@itsm.enterprise'}</p>
                <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {user?.role || 'Admin'}
                </span>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push('/admin');
                  }}
                  className="w-full text-left px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  Super Admin Console
                </button>
              </div>

              <div className="border-t border-border pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3.5 py-1.5 text-xs text-danger hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5 text-danger" />
                  ออกจากระบบ (Logout)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
