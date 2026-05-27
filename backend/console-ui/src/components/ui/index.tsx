import type { ReactNode, ButtonHTMLAttributes, SelectHTMLAttributes, InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const inputBase =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60';

export const inputClass = inputBase;
export const selectClass = cn(inputBase, 'pr-9');

import { PageLoader, PageShell } from './PageLoader';

export { PageLoader, PageShell };

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <PageLoader label={label} compact />;
}

export function Alert({
  tone,
  children,
  className,
}: {
  tone: 'error' | 'success' | 'warn' | 'info';
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-sky-200 bg-sky-50 text-sky-900',
  };
  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border px-4 py-3 text-sm leading-relaxed',
        tones[tone],
        className
      )}
    >
      {children}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className = '',
  bodyClassName = '',
  noPadding,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-[var(--radius-card)] border border-slate-200/90 bg-white shadow-[var(--shadow-card)]',
        className
      )}
    >
      {title ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {description ? (
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn(!noPadding && 'p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function HubTabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: Array<{ id: T; label: string; badge?: number }>;
  active: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className
      )}
      role="tablist"
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={cn(
              'relative shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition',
              isActive
                ? 'text-brand-700 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand-500'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            )}
            onClick={() => onChange(t.id)}
          >
            {t.label}
            {t.badge != null && t.badge > 0 ? (
              <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {t.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 disabled:pointer-events-none disabled:opacity-50';

export function Btn({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}) {
  const variants = {
    primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800',
    secondary:
      'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
  };
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
  };
  return (
    <button
      type="button"
      className={cn(btnBase, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(selectClass, className)} {...props} />;
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('mb-1.5 block text-sm font-medium text-slate-700', className)}>
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <Label>{label}</Label>
      {children}
    </label>
  );
}

export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('-mx-4 overflow-x-auto sm:mx-0', className)}>
      <div className="inline-block min-w-full align-middle">{children}</div>
    </div>
  );
}

export function DataTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <table className={cn('min-w-full divide-y divide-slate-200 text-left text-sm', className)}>
      {children}
    </table>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>;
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn('px-4 py-3 whitespace-nowrap', className)}>{children}</th>;
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 align-middle text-slate-700', className)}>{children}</td>;
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'active' | 'archived' | 'role' | 'neutral' | 'warn' | 'success' | 'info';
}) {
  const tones = {
    active: 'bg-emerald-100 text-emerald-800 ring-emerald-600/10',
    archived: 'bg-slate-100 text-slate-600 ring-slate-500/10',
    role: 'bg-violet-100 text-violet-800 ring-violet-600/10',
    neutral: 'bg-slate-100 text-slate-700 ring-slate-500/10',
    warn: 'bg-amber-100 text-amber-900 ring-amber-600/10',
    success: 'bg-emerald-100 text-emerald-800 ring-emerald-600/10',
    info: 'bg-sky-100 text-sky-800 ring-sky-600/10',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('py-10 text-center text-sm text-slate-500', className)}>{children}</p>
  );
}

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center',
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {title ? <h2 className="text-lg font-semibold text-slate-900 sm:hidden">{title}</h2> : null}
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
}) {
  return (
    <article className="rounded-[var(--radius-card)] border border-slate-200/90 bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {icon ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </article>
  );
}

export function ReadOnlyBanner() {
  return (
    <Alert tone="warn">
      Read-only — you can view data but cannot make changes on this page.
    </Alert>
  );
}
