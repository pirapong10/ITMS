import React, { useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string; label: string }[];
}

export function Select({
  className,
  label,
  error,
  options,
  children,
  id,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={twMerge(
          clsx(
            'w-full text-xs bg-surface border border-border rounded-md px-3 py-2 text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer',
            error && 'border-danger focus:ring-danger/20 focus:border-danger',
            className
          )
        )}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-surface text-dark">
                {opt.label}
              </option>
            ))
          : children}
      </select>
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  );
}
