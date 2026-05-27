import type { ReactNode } from 'react';
import { Btn, inputClass } from './ui';
import { cn } from '../lib/cn';

type Props = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSave?: () => void;
  saveLabel?: string;
  saving?: boolean;
  wide?: boolean;
};

export function Modal({ title, children, onClose, onSave, saveLabel = 'Save', saving, wide }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl',
          wide ? 'max-w-2xl' : 'max-w-lg'
        )}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <Btn variant="secondary" onClick={onClose}>
            Cancel
          </Btn>
          {onSave ? (
            <Btn variant="primary" disabled={saving} onClick={onSave}>
              {saving ? 'Saving…' : saveLabel}
            </Btn>
          ) : null}
        </footer>
      </div>
    </div>
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
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export { inputClass };
