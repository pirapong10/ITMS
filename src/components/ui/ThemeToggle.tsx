'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme, Theme } from './ThemeContext';
import { clsx } from 'clsx';

export interface ThemeToggleProps {
  className?: string;
  variant?: 'dropdown' | 'icon-button';
}

export function ThemeToggle({ className, variant = 'dropdown' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    {
      value: 'light',
      label: 'สว่าง (Light)',
      icon: <Sun className="w-3.5 h-3.5 text-amber-500" />,
    },
    {
      value: 'dark',
      label: 'มืด (Dark)',
      icon: <Moon className="w-3.5 h-3.5 text-blue-400" />,
    },
    {
      value: 'system',
      label: 'ตามระบบ (System)',
      icon: <Laptop className="w-3.5 h-3.5 text-slate-400" />,
    },
  ];

  if (variant === 'icon-button') {
    return (
      <button
        onClick={toggleTheme}
        title={`ธีมปัจจุบัน: ${theme} (คลิกเพื่อสลับ)`}
        aria-label="Toggle Theme"
        className={clsx(
          'p-2 rounded-lg text-slate-500 hover:text-dark hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30',
          className
        )}
      >
        {resolvedTheme === 'dark' ? (
          <Moon className="w-4 h-4 text-blue-400" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
      </button>
    );
  }

  return (
    <div className={clsx('relative', className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="เปลี่ยนธีม (Theme)"
        aria-label="Select Theme"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1 rounded-md border border-border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {resolvedTheme === 'dark' ? (
          <Moon className="w-3 h-3 text-blue-400" />
        ) : (
          <Sun className="w-3 h-3 text-amber-500" />
        )}
        <span className="capitalize">
          {theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}
        </span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-1.5 w-40 bg-surface border border-border rounded-xl shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-1 border-b border-border text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            เลือกธีม (Theme)
          </div>
          {options.map((opt) => (
            <button
              key={opt.value}
              role="menuitem"
              onClick={() => {
                setTheme(opt.value);
                setIsOpen(false);
              }}
              className={clsx(
                'w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors cursor-pointer',
                theme === opt.value
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-dark dark:hover:text-white'
              )}
            >
              <div className="flex items-center gap-2">
                {opt.icon}
                <span>{opt.label}</span>
              </div>
              {theme === opt.value && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
