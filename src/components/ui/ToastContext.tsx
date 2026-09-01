'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
}

const fallbackToast: ToastContextType = {
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
  toast: {
    success: (msg: string, title?: string) => {},
    error: (msg: string, title?: string) => {},
    warning: (msg: string, title?: string) => {},
    info: (msg: string, title?: string) => {},
  },
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, duration = 3500 }: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toastHelpers = {
    success: (message: string, title?: string) => addToast({ type: 'success', message, title }),
    error: (message: string, title?: string) => addToast({ type: 'error', message, title }),
    warning: (message: string, title?: string) => addToast({ type: 'warning', message, title }),
    info: (message: string, title?: string) => addToast({ type: 'info', message, title }),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast: toastHelpers }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return fallbackToast;
  }
  return context;
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2 sm:p-0">
      {toasts.map((item) => {
        const icons = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />,
          error: <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />,
          warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />,
          info: <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />,
        };

        const borderColors = {
          success: 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-100',
          error: 'border-red-200 dark:border-red-800/80 bg-red-50/95 dark:bg-red-950/90 text-red-900 dark:text-red-100',
          warning: 'border-amber-200 dark:border-amber-800/80 bg-amber-50/95 dark:bg-amber-950/90 text-amber-900 dark:text-amber-100',
          info: 'border-blue-200 dark:border-blue-800/80 bg-blue-50/95 dark:bg-blue-950/90 text-blue-900 dark:text-blue-100',
        };

        return (
          <div
            key={item.id}
            className={clsx(
              'pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-200 animate-in slide-in-from-bottom-5 fade-in',
              borderColors[item.type]
            )}
          >
            <div className="flex items-start gap-2.5">
              {icons[item.type]}
              <div className="space-y-0.5">
                {item.title && <p className="text-xs font-bold leading-none">{item.title}</p>}
                <p className="text-xs font-medium leading-relaxed">{item.message}</p>
              </div>
            </div>
            <button
              onClick={() => onRemove(item.id)}
              className="p-1 rounded-md text-slate-400 hover:text-dark dark:hover:text-white transition-all shrink-0 cursor-pointer"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
