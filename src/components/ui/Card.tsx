import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({
  className,
  hover = false,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-surface border border-border rounded-lg shadow-xs p-5 transition-all',
          hover && 'hover:shadow-md hover:border-slate-300',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}
