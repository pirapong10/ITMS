'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Ticket,
  Laptop,
  Key,
  FolderKanban,
  Wrench,
  GitPullRequest,
  AlertCircle,
  BookOpen,
  CreditCard,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { clsx } from 'clsx';

export const navigationItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Helpdesk Tickets', href: '/tickets', icon: Ticket, badge: 'Active' },
  { name: 'IT Assets Inventory', href: '/assets', icon: Laptop },
  { name: 'Software Licenses', href: '/licenses', icon: Key },
  { name: 'Projects & Tasks', href: '/projects', icon: FolderKanban },
  { name: 'Operations & PM', href: '/operations', icon: Wrench },
  { name: 'Change Enablement (CAB)', href: '/changes', icon: GitPullRequest },
  { name: 'Problem Management (RCA)', href: '/problems', icon: AlertCircle },
  { name: 'Knowledge Base (KCS)', href: '/knowledge', icon: BookOpen },
  { name: 'Billing & Subscriptions', href: '/billing', icon: CreditCard },
  { name: 'Super Admin Portal', href: '/admin', icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col h-screen sticky top-0 shrink-0 select-none">
      {/* Brand Logo Header */}
      <div className="h-14 border-b border-border px-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-black shadow-xs shadow-primary/20">
          <Zap className="w-4 h-4 fill-current" />
        </div>
        <div>
          <h1 className="text-sm font-extrabold text-dark tracking-tight leading-none">ITSM Enterprise</h1>
          <p className="text-[10px] font-bold text-primary tracking-wide uppercase mt-0.5">SaaS Platform v2.1</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
        <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Service Management
        </div>

        {navigationItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all group',
                isActive
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-dark dark:hover:text-white'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={clsx(
                    'w-4 h-4 transition-colors',
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-dark dark:group-hover:text-white'
                  )}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={clsx(
                    'text-[10px] font-bold px-1.5 py-0.2 rounded-full',
                    isActive ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / System Status */}
      <div className="p-3.5 border-t border-border bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">System Healthy</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">100% SLA</span>
        </div>
      </div>
    </aside>
  );
}
