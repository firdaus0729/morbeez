import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { roleLabel } from '../lib/format';
import { Field, Modal, inputClass } from '../components/Modal';
import {
  Alert,
  Badge,
  Btn,
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

export function SettingsPage({ canRead, canWrite }: { canRead: boolean; canWrite?: boolean }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Staff | null>(null);

  async function reload() {
    const d = await api<{ ok: boolean; staff: Staff[] }>('/console/api/v1/os/settings/staff');
    setStaff(d.staff ?? []);
  }

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
                  {canWrite ? <th /> : null}
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
                    {canWrite ? (
                      <td>
                        <div className="flex gap-2">
                          <Btn size="sm" variant="secondary" onClick={() => setEditing(s)}>
                            Edit
                          </Btn>
                          {s.active ? (
                            <Btn
                              size="sm"
                              variant="danger"
                              onClick={async () => {
                                if (!confirm(`Deactivate ${s.email}?`)) return;
                                await api(`/console/api/v1/os/settings/staff/${s.id}`, {
                                  method: 'DELETE',
                                });
                                await reload();
                              }}
                            >
                              Deactivate
                            </Btn>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </TableWrap>
          {staff.length === 0 ? <EmptyState>No staff users.</EmptyState> : null}
        </Panel>
      ) : null}
      {editing ? (
        <EditStaffModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reload();
          }}
        />
      ) : null}
    </div>
  );
}

function EditStaffModal({
  row,
  onClose,
  onSaved,
}: {
  row: Staff;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [fullName, setFullName] = useState(row.fullName ?? '');
  const [role, setRole] = useState(row.role);
  const [active, setActive] = useState(row.active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setError('');
    try {
      await api(`/console/api/v1/os/settings/staff/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ fullName, role, active }),
      });
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update staff');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit staff" onClose={onClose} onSave={save} saveLabel="Update" saving={saving}>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="space-y-3">
        <Field label="Name">
          <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Role">
          <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="operations">Operations</option>
            <option value="agronomist">Agronomist</option>
            <option value="telecaller">Telecaller</option>
            <option value="manager">Manager</option>
            <option value="viewer">Viewer</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
      </div>
    </Modal>
  );
}
