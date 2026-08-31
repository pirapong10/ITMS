'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  Globe,
  User,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { getStoredUser, clearSession, getStoredTenantId, setStoredTenantId } from '../../lib/api-client';
import { useRouter } from 'next/navigation';

export interface HeaderProps {
  onOpenSearch: () => void;
}

export function Header({ onOpenSearch }: HeaderProps) {
  const [user, setUser] = useState<any>(null);
  const [tenantId, setTenantIdState] = useState('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [lang, setLang] = useState<'TH' | 'EN'>('TH');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setUser(getStoredUser());
    setTenantIdState(getStoredTenantId());

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        setNotifOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  const toggleLanguage = () => {
    const nextLang = lang === 'TH' ? 'EN' : 'TH';
    setLang(nextLang);
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
        <div
          title="Tenant Organization ID"
          className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-border max-w-[200px]"
        >
          <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="font-semibold text-dark truncate">{tenantId}</span>
        </div>
      </div>

      {/* Right: Actions, Language/Currency & User Menu */}
      <div className="flex items-center gap-2.5">
        {/* Language & Currency Pill Button */}
        <button
          onClick={toggleLanguage}
          title="สลับภาษาและสกุลเงิน (Switch Language / Currency)"
          className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-md border border-border transition-all cursor-pointer"
        >
          <Globe className="w-3 h-3 text-slate-400" />
          <span>{lang === 'TH' ? 'TH / THB ฿' : 'EN / USD $'}</span>
        </button>

        {/* Notification Bell with Popup Drawer */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 rounded-lg text-slate-500 hover:text-dark hover:bg-slate-100 transition-all relative cursor-pointer"
            title="การแจ้งเตือนระบบ"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-white" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-xl shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-1.5 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-dark">การแจ้งเตือน (Notifications)</span>
                <span className="text-[10px] font-semibold text-primary bg-blue-50 px-1.5 py-0.5 rounded-full">
                  2 รายการ
                </span>
              </div>
              <div className="divide-y divide-border/60 max-h-60 overflow-y-auto">
                <div
                  onClick={() => {
                    setNotifOpen(false);
                    router.push('/tickets');
                  }}
                  className="p-3 hover:bg-slate-50 cursor-pointer transition-all"
                >
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-dark">SLA Warning: Ticket #TCK-001</p>
                      <p className="text-[11px] text-slate-500">เหลือเวลาตอบกลับตาม SLA อีก 25 นาที</p>
                    </div>
                  </div>
                </div>
                <div
                  onClick={() => {
                    setNotifOpen(false);
                    router.push('/changes');
                  }}
                  className="p-3 hover:bg-slate-50 cursor-pointer transition-all"
                >
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-dark">CAB Review Request</p>
                      <p className="text-[11px] text-slate-500">มี Change Request ใหม่รอการอนุมัติ</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
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
                <p className="text-[11px] text-slate-400 truncate">{user?.email || 'admin@company.com'}</p>
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
                  className="w-full text-left px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  Super Admin Console
                </button>
              </div>

              <div className="border-t border-border pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3.5 py-1.5 text-xs text-danger hover:bg-red-50 flex items-center gap-2 cursor-pointer"
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
