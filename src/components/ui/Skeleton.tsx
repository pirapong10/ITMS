import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={twMerge(
        clsx('animate-pulse bg-slate-200/80 dark:bg-slate-800/80 rounded-md', className)
      )}
      {...props}
    />
  );
}

export function TableRowSkeleton({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="border-b border-border/40 last:border-0 animate-pulse">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <td key={cIdx} className="py-3.5 px-4">
              <Skeleton
                className={clsx(
                  'h-3.5',
                  cIdx === 0 ? 'w-20' : cIdx === 1 ? 'w-48 max-w-full' : 'w-24'
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="w-full space-y-3 p-4">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center gap-4 py-2 border-b border-border/40 last:border-0">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <Skeleton
              key={cIdx}
              className={clsx(
                'h-4',
                cIdx === 0 ? 'w-24' : cIdx === 1 ? 'flex-1' : 'w-20'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="p-4 bg-surface border border-border rounded-xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-36" />
        </div>
      ))}
    </div>
  );
}
