import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate' | 'gray';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'blue',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const variantClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-0.5 font-semibold',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1 rounded-full border leading-tight',
          variantClasses[variant],
          sizeClasses[size],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
}
