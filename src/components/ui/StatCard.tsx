import React from 'react';
import { Card } from './Card';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: 'blue' | 'green' | 'amber' | 'red' | 'slate';
}

export function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  variant = 'blue',
}: StatCardProps) {
  const iconColors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <Card hover className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-lg ${iconColors[variant]}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-extrabold text-dark tracking-tight">{value}</span>
        {trend && (
          <span
            className={`text-[11px] font-semibold ${
              trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>

      {subtext && <p className="text-[11px] text-slate-400 mt-1">{subtext}</p>}
    </Card>
  );
}
