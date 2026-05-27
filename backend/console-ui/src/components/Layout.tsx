import type { ReactNode } from 'react';
import type { ApiModule, SessionAdmin } from '../lib/api';
import { canAccess } from '../lib/api';

type Props = {
  admin: SessionAdmin;
  modules: ApiModule[];
  page: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  children: ReactNode;
};

const NAV: Array<{ key: string; label: string; module: string }> = [
  { key: 'dashboard', label: 'Dashboard', module: 'dashboard' },
  { key: 'telecaller', label: 'Telecaller CRM', module: 'telecaller_crm' },
  { key: 'operations', label: 'Operations', module: 'operations' },
  { key: 'intelligence', label: 'Intelligence', module: 'intelligence' },
  { key: 'agronomist', label: 'Agronomist', module: 'agronomist' },
  { key: 'field', label: 'Field app ↗', module: 'agronomist' },
  { key: 'approvals', label: 'Approvals', module: 'approve_recommendations' },
  { key: 'gaps', label: 'Product Gaps', module: 'intelligence' },
  { key: 'analytics', label: 'Analytics', module: 'analytics' },
  { key: 'commerce', label: 'Commerce', module: 'commerce' },
  { key: 'settings', label: 'Settings', module: 'settings' },
];

export function Layout({ admin, modules, page, onNavigate, onLogout, children }: Props) {
  const visibleNav = NAV.filter((n) => canAccess(modules, n.module, 'read'));

  return (
    <div className="flex min-h-full">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-4">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Morbeez</p>
          <p className="text-sm font-medium text-slate-900">Operations Console</p>
        </div>
        <nav className="space-y-1">
          {visibleNav.map((item) =>
            item.key === 'field' ? (
              <a
                key={item.key}
                href="/field/"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {item.label}
              </a>
            ) : (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  page === item.key
                    ? 'bg-emerald-50 font-medium text-emerald-800'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            )
          )}
        </nav>
        <div className="mt-8 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <p className="font-medium text-slate-700">{admin.fullName ?? admin.email}</p>
          <p className="capitalize">{admin.role.replace(/_/g, ' ')}</p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 text-sm text-red-600 hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
