import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'dark' | 'ghost' | 'danger' | 'ghost-danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-md transition-all select-none gap-1.5 focus:outline-none';

  const variantClasses = {
    primary: 'bg-primary text-white shadow-sm hover:bg-primary-hover active:translate-y-0',
    dark: 'bg-dark text-white shadow-sm hover:bg-dark-hover active:translate-y-0',
    ghost: 'bg-surface text-slate-600 border border-border hover:bg-slate-50 hover:text-dark hover:border-slate-300',
    danger: 'bg-danger-light text-danger border border-red-200 hover:bg-red-100',
    'ghost-danger': 'bg-transparent text-slate-400 border border-border hover:bg-danger-light hover:text-danger hover:border-red-300',
    outline: 'bg-transparent text-primary border border-primary hover:bg-primary-light',
  };

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5',
    md: 'text-xs px-3.5 py-2',
    lg: 'text-sm px-4 py-2.5',
    icon: 'p-1.5 w-8 h-8 rounded-md justify-center',
  };

  return (
    <button
      className={twMerge(
        clsx(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          (disabled || loading) && 'opacity-60 cursor-not-allowed transform-none hover:transform-none',
          className
        )
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  );
}
