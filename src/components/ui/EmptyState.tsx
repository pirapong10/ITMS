import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center space-y-3 ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
        <Icon className="w-6 h-6 stroke-[1.5]" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-bold text-dark">{title}</h4>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
