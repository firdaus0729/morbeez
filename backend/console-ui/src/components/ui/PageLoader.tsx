import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Props = {
  label?: string;
  className?: string;
  compact?: boolean;
};

export function PageLoader({ label = 'Loading…', className, compact }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-10' : 'min-h-[280px] py-16',
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative flex h-14 w-14 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-brand-400/25" />
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-600" />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-1 max-w-xs text-xs text-slate-500">Please wait while we fetch the latest data</p>
    </div>
  );
}

export function PageShell({
  loading,
  error,
  children,
  loadingLabel,
}: {
  loading?: boolean;
  error?: string | null;
  children?: ReactNode;
  loadingLabel?: string;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <PageLoader label={loadingLabel} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      </div>
    );
  }
  return children ? <>{children}</> : null;
}
