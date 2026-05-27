import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { roleLabel } from '../lib/format';
import {
  Alert,
  Badge,
  DataTable,
  EmptyState,
  Loading,
  Panel,
  ReadOnlyBanner,
  TableWrap,
} from '../components/ui';

type Staff = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  active: boolean;
  lastLoginAt: string | null;
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
      <Panel title="Settings">
        <ReadOnlyBanner />
      </Panel>
    );
  }

  return (
    <div>
      <p className="muted" style={{ marginBottom: 16 }}>
        Staff accounts and RBAC. For full employee workspace, use <strong>Employees</strong> in the sidebar.
      </p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {loading ? <Loading /> : null}
      {!loading ? (
        <Panel title="Staff accounts">
          <TableWrap>
            <DataTable>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last login</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td>{s.email}</td>
                    <td>{s.fullName ?? '—'}</td>
                    <td>
                      <Badge tone="role">{roleLabel(s.role)}</Badge>
                    </td>
                    <td>
                      <Badge tone={s.active ? 'active' : 'archived'}>
                        {s.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="muted">
                      {s.lastLoginAt
                        ? new Date(s.lastLoginAt).toLocaleString('en-IN')
                        : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </TableWrap>
          {staff.length === 0 ? <EmptyState>No staff users.</EmptyState> : null}
        </Panel>
      ) : null}
    </div>
  );
}
