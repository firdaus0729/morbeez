import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Staff = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export function SettingsPage({ canRead }: { canRead: boolean }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    api<{ ok: boolean; staff: Staff[] }>('/console/api/v1/os/settings/staff')
      .then((d) => setStaff(d.staff ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [canRead]);

  if (!canRead) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-slate-600">Super Admin only.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
      <p className="mt-1 text-sm text-slate-600">Staff accounts and console access</p>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}

      {!loading ? (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Last login</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{s.email}</td>
                  <td className="px-4 py-3">{s.fullName ?? '—'}</td>
                  <td className="px-4 py-3 capitalize">{s.role.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">{s.active ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {s.lastLoginAt
                      ? new Date(s.lastLoginAt).toLocaleString('en-IN')
                      : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {staff.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No staff users.</p>
          ) : null}
        </div>
      ) : null}

      <p className="mt-6 text-xs text-slate-500">
        Role permissions are defined in <code>role_module_permissions</code> (see OS foundation
        migration). Staff CRUD via API can be added in a follow-up.
      </p>
    </div>
  );
}
