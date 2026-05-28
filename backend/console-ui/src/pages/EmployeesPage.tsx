import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { paths, toPath } from '../lib/routes';
import { formatInrFull, initials, roleLabel } from '../lib/format';
import { Field, Modal, inputClass } from '../components/Modal';
import {
  Alert,
  Badge,
  Btn,
  DataTable,
  EmptyState,
  FilterBar,
  Input,
  Loading,
  Panel,
  Select,
  TableWrap,
} from '../components/ui';
import { StatIcon } from '../components/NavIcon';

type Employee = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  active: boolean;
  employeeCode: string;
  totalLeads: number;
  pendingTasks: number;
  pendingFollowUpsToday: number;
  turnoverInr: number;
  performanceScore: number;
  performanceLabel: string;
  statusOnline: boolean;
};

type Workspace = {
  summary: {
    totalEmployees: number;
    activeCount: number;
    inactiveCount: number;
    avgPerformanceScore: number;
    avgTurnoverInr: number;
    pendingTasks: number;
  };
  secondary: {
    onlineNow: number;
    lateLogin: number;
    lowTurnover: number;
    totalLeads: number;
  };
  employees: Employee[];
};

type Detail = {
  employee: Employee;
  overview: Record<string, unknown>;
  turnoverTrend: { labels: string[]; values: number[] };
  performanceBreakdown: Array<{ label: string; pct: number }>;
  recentLeads: Array<{ id: string; name: string; crop: string; when: string }>;
  recentTasks: Array<{ id: string; title: string; status: string; dueAt: string | null }>;
};

function perfClass(label: string): string {
  if (label === 'Excellent') return 'perf-excellent';
  if (label === 'Very Good') return 'perf-verygood';
  if (label === 'Good') return 'perf-good';
  if (label === 'Average') return 'perf-average';
  return 'perf-low';
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ProgressRing({ pct, label, display }: { pct: number; label: string; display: string }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="emp-ring">
      <svg viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#e5ebe7" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="#34b35e"
          strokeWidth="8"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 44 44)"
        />
        <text x="44" y="48" textAnchor="middle" className="emp-ring-value">
          {display}
        </text>
      </svg>
      <div className="emp-ring-label">{label}</div>
    </div>
  );
}

export function EmployeesPage({ canWrite = false }: { canWrite?: boolean }) {
  const { employeeId } = useParams<{ employeeId?: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [listTab, setListTab] = useState<'active' | 'inactive'>('active');
  const [detailTab, setDetailTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNewEmployee, setShowNewEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api<{ ok: boolean } & Workspace>('/console/api/v1/staff/workspace');
      setWorkspace(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!employeeId) {
      setDetail(null);
      return;
    }
    void (async () => {
      setDetailLoading(true);
      setError('');
      try {
        const d = await api<{ ok: boolean } & Detail>(`/console/api/v1/staff/${employeeId}`);
        setDetail(d);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load employee');
      } finally {
        setDetailLoading(false);
      }
    })();
  }, [employeeId]);

  async function createEmployee(input: {
    fullName: string;
    email: string;
    role: string;
    status: 'active' | 'inactive';
    personalMobile?: string;
    companyWhatsapp?: string;
    alternateMobile?: string;
    gender?: string;
    dateOfBirth?: string;
    joiningDate?: string;
    department?: string;
    reportingManagerId?: string | null;
    employmentType?: string;
    state?: string;
    district?: string;
    taluk?: string;
    address?: string;
    languages?: string[];
    cropsExpertise?: string[];
    diseaseKnowledgeRating?: number;
    whatsappSkillRating?: number;
    customerHandlingRating?: number;
    fieldExperienceYears?: number;
    compensation?: Record<string, unknown>;
    attendanceRules?: Record<string, unknown>;
  }) {
    await api<{ ok: boolean; employee: { id: string } }>('/console/api/v1/employees', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    await loadWorkspace();
  }

  async function updateEmployee(
    id: string,
    input: { fullName?: string; role?: string; active?: boolean }
  ) {
    await api(`/console/api/v1/staff/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    await loadWorkspace();
  }

  async function deactivateEmployee(id: string) {
    await api(`/console/api/v1/employees/${id}/deactivate`, { method: 'POST', body: '{}' });
    await loadWorkspace();
  }

  async function sendResetLink(id: string) {
    await api(`/console/api/v1/employees/${id}/reset-password-link`, {
      method: 'POST',
      body: JSON.stringify({ channels: ['email'] }),
    });
    await loadWorkspace();
  }

  if (employeeId && detailLoading && !detail) {
    return <Loading label="Loading employee…" />;
  }
  if (employeeId && error && !detail) {
    return <Alert tone="error">{error}</Alert>;
  }

  if (!employeeId) {
    if (loading && !workspace) return <Loading label="Loading employees…" />;
    if (error && !workspace) return <Alert tone="error">{error}</Alert>;
    if (!workspace) return null;
  }

  if (employeeId && detail) {
    const e = detail.employee;
    const roi = e.turnoverInr > 0 ? Math.round((e.performanceScore / 70) * 100) : 0;

    return (
      <div className="emp-page route-employees-detail">
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <button
            type="button"
            className="font-semibold text-brand-700 hover:underline"
            onClick={() => navigate(toPath(paths.employees))}
          >
            Employees
          </button>
          <span>/</span>
          <span className="font-medium text-slate-800">{e.fullName}</span>
        </nav>

        <div className="emp-detail-header">
          <div className="emp-profile-main">
            <div className="emp-avatar-lg">{initials(e.fullName)}</div>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '1.35rem' }}>
                {e.fullName} {e.active ? <Badge tone="active">Active</Badge> : <Badge tone="archived">Inactive</Badge>}
              </h2>
              <p className="muted" style={{ margin: 0 }}>
                {roleLabel(e.role)} · {e.employeeCode} · {e.email}
              </p>
              <p className="muted" style={{ margin: '8px 0 0', fontSize: 13 }}>
                📞 {e.email} · 🌐 English
              </p>
            </div>
          </div>
          <div className="emp-metrics-rings">
            <ProgressRing pct={e.performanceScore} label="Performance" display={`${e.performanceScore}%`} />
            <ProgressRing pct={Math.min(100, roi)} label="ROI" display={`${roi}%`} />
            <ProgressRing pct={75} label="Turnover" display={formatInrFull(e.turnoverInr)} />
          </div>
        </div>

        <div className="emp-subtabs">
          {['overview', 'performance', 'leads', 'tasks', 'activity'].map((t) => (
            <button
              key={t}
              type="button"
              className={`emp-subtab ${detailTab === t ? 'active' : ''}`}
              onClick={() => setDetailTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {detailTab === 'overview' ? (
          <>
            <div className="emp-overview-grid">
              <div className="emp-mini-card">
                <div className="emp-mini-label">Pending Tasks</div>
                <div className="emp-mini-value">{e.pendingTasks}</div>
              </div>
              <div className="emp-mini-card">
                <div className="emp-mini-label">Follow-ups Today</div>
                <div className="emp-mini-value">{e.pendingFollowUpsToday}</div>
              </div>
              <div className="emp-mini-card">
                <div className="emp-mini-label">Total Leads</div>
                <div className="emp-mini-value">{e.totalLeads}</div>
              </div>
              <div className="emp-mini-card">
                <div className="emp-mini-label">Interactions (mo)</div>
                <div className="emp-mini-value">{Number(detail.overview.interactionsThisMonth ?? 0)}</div>
              </div>
              <div className="emp-mini-card">
                <div className="emp-mini-label">Status</div>
                <div className="emp-mini-value" style={{ fontSize: '1rem' }}>
                  <span className={`status-dot ${e.statusOnline ? 'online' : ''}`}>
                    {e.statusOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            <div className="emp-chart-row">
              <Panel title="Turnover trend (6 months)">
                <div className="chart-wrap" style={{ height: 220, padding: '12px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180 }}>
                    {detail.turnoverTrend.values.map((v, i) => {
                      const max = Math.max(...detail.turnoverTrend.values, 1);
                      return (
                        <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                          <div
                            style={{
                              height: `${Math.max(8, (v / max) * 140)}px`,
                              background: 'var(--green-500)',
                              borderRadius: '6px 6px 0 0',
                            }}
                          />
                          <small className="muted">{detail.turnoverTrend.labels[i]}</small>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Panel>
              <Panel title="Performance breakdown">
                {detail.performanceBreakdown.map((row) => (
                  <div className="emp-bar-row" key={row.label}>
                    <span className="emp-bar-label">{row.label}</span>
                    <div className="emp-bar-track">
                      <div className="emp-bar-fill" style={{ width: `${row.pct}%` }} />
                    </div>
                    <span style={{ width: 36, fontSize: 12, fontWeight: 700 }}>{row.pct}%</span>
                  </div>
                ))}
              </Panel>
            </div>

            <div className="emp-bottom-grid">
              <Panel title="Recent leads">
                {detail.recentLeads.length ? (
                  detail.recentLeads.map((l) => (
                    <div className="emp-list-item" key={l.id}>
                      <strong>{l.name}</strong>
                      <div className="muted">{l.crop}</div>
                    </div>
                  ))
                ) : (
                  <EmptyState>No leads assigned</EmptyState>
                )}
              </Panel>
              <Panel title="Recent tasks">
                {detail.recentTasks.length ? (
                  detail.recentTasks.map((t) => (
                    <div className="emp-list-item" key={t.id}>
                      <strong>{t.title}</strong>
                      <Badge tone={t.status === 'done' ? 'success' : 'warn'}>{t.status}</Badge>
                    </div>
                  ))
                ) : (
                  <EmptyState>No tasks</EmptyState>
                )}
              </Panel>
              <Panel title="Employee info">
                <div className="emp-list-item">
                  <span className="muted">Role</span>
                  <div>{roleLabel(e.role)}</div>
                </div>
                <div className="emp-list-item">
                  <span className="muted">Code</span>
                  <div>{e.employeeCode}</div>
                </div>
                <div className="emp-list-item">
                  <span className="muted">Performance</span>
                  <div>
                    <span className={`perf-pill ${perfClass(e.performanceLabel)}`}>{e.performanceLabel}</span>
                  </div>
                </div>
              </Panel>
            </div>
          </>
        ) : null}

        {detailTab === 'performance' ? (
          <div className="space-y-4">
            <Panel title="Performance breakdown">
              {detail.performanceBreakdown.length ? (
                detail.performanceBreakdown.map((row) => (
                  <div className="emp-bar-row" key={row.label}>
                    <span className="emp-bar-label">{row.label}</span>
                    <div className="emp-bar-track">
                      <div className="emp-bar-fill" style={{ width: `${row.pct}%` }} />
                    </div>
                    <span style={{ width: 36, fontSize: 12, fontWeight: 700 }}>{row.pct}%</span>
                  </div>
                ))
              ) : (
                <EmptyState>No performance components available</EmptyState>
              )}
            </Panel>
            <Panel title="Turnover trend (6 months)">
              <div className="chart-wrap" style={{ height: 220, padding: '12px 0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180 }}>
                  {detail.turnoverTrend.values.map((v, i) => {
                    const max = Math.max(...detail.turnoverTrend.values, 1);
                    return (
                      <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                        <div
                          style={{
                            height: `${Math.max(8, (v / max) * 140)}px`,
                            background: 'var(--green-500)',
                            borderRadius: '6px 6px 0 0',
                          }}
                        />
                        <small className="muted">{detail.turnoverTrend.labels[i]}</small>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Panel>
          </div>
        ) : null}

        {detailTab === 'leads' ? (
          <Panel title="Assigned leads">
            <TableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Crop / Area</th>
                    <th>Last interaction</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.recentLeads.length ? (
                    detail.recentLeads.map((lead) => (
                      <tr key={lead.id}>
                        <td>
                          <strong>{lead.name}</strong>
                        </td>
                        <td>{lead.crop || '—'}</td>
                        <td>{formatDateTime(lead.when)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3}>
                        <EmptyState>No leads assigned</EmptyState>
                      </td>
                    </tr>
                  )}
                </tbody>
              </DataTable>
            </TableWrap>
          </Panel>
        ) : null}

        {detailTab === 'tasks' ? (
          <Panel title="Assigned tasks">
            <TableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.recentTasks.length ? (
                    detail.recentTasks.map((task) => (
                      <tr key={task.id}>
                        <td>
                          <strong>{task.title}</strong>
                        </td>
                        <td>
                          <Badge tone={task.status === 'done' ? 'success' : 'warn'}>{task.status}</Badge>
                        </td>
                        <td>{formatDateTime(task.dueAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3}>
                        <EmptyState>No tasks</EmptyState>
                      </td>
                    </tr>
                  )}
                </tbody>
              </DataTable>
            </TableWrap>
          </Panel>
        ) : null}

        {detailTab === 'activity' ? (
          <Panel title="Employee activity timeline">
            {(() => {
              const events = [
                ...detail.recentLeads.map((l) => ({
                  id: `lead-${l.id}`,
                  label: `Lead touched: ${l.name}`,
                  sub: l.crop || 'Lead activity',
                  at: l.when,
                })),
                ...detail.recentTasks.map((t) => ({
                  id: `task-${t.id}`,
                  label: `Task update: ${t.title}`,
                  sub: `Status: ${t.status}`,
                  at: t.dueAt,
                })),
              ]
                .filter((x) => !!x.at)
                .sort((a, b) => new Date(String(b.at)).getTime() - new Date(String(a.at)).getTime());

              if (!events.length) return <EmptyState>No activity available yet</EmptyState>;

              return (
                <div className="space-y-3">
                  {events.map((ev) => (
                    <div key={ev.id} className="emp-list-item">
                      <div>
                        <strong>{ev.label}</strong>
                        <div className="muted">{ev.sub}</div>
                      </div>
                      <div className="muted">{formatDateTime(ev.at)}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Panel>
        ) : null}
      </div>
    );
  }

  const filtered = workspace.employees.filter((e) => {
    if (listTab === 'active' && !e.active) return false;
    if (listTab === 'inactive' && e.active) return false;
    if (roleFilter && e.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        e.fullName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const s = workspace.summary;
  const sec = workspace.secondary;

  return (
    <div className="emp-page">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="stat-grid">
        <article className="stat-card">
          <div className="stat-card-head">
            <span className="stat-label">Total Employees</span>
            <span className="stat-icon stat-icon-teal">
              <StatIcon name="farmers" />
            </span>
          </div>
          <div className="stat-value">{s.totalEmployees}</div>
          <div className="stat-trend trend-up">
            <span className="trend-pct">+{s.activeCount}</span>
            <span className="trend-vs">active</span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card-head">
            <span className="stat-label">Avg Performance</span>
            <span className="stat-icon stat-icon-purple">
              <StatIcon name="trend" />
            </span>
          </div>
          <div className="stat-value">{s.avgPerformanceScore}</div>
          <div className="stat-trend trend-up">
            <span className="trend-pct">/ 100</span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card-head">
            <span className="stat-label">Avg Turnover</span>
            <span className="stat-icon stat-icon-green">
              <StatIcon name="sales" />
            </span>
          </div>
          <div className="stat-value">{formatInrFull(s.avgTurnoverInr)}</div>
        </article>
        <article className="stat-card">
          <div className="stat-card-head">
            <span className="stat-label">Pending Tasks</span>
            <span className="stat-icon stat-icon-orange">
              <StatIcon name="cart" />
            </span>
          </div>
          <div className="stat-value">{s.pendingTasks}</div>
        </article>
      </div>

      <div className="emp-mini-grid">
        <div className="emp-mini-card">
          <div className="emp-mini-label">Online now</div>
          <div className="emp-mini-value">{sec.onlineNow}</div>
        </div>
        <div className="emp-mini-card">
          <div className="emp-mini-label">Late login</div>
          <div className="emp-mini-value">{sec.lateLogin}</div>
        </div>
        <div className="emp-mini-card">
          <div className="emp-mini-label">Low turnover</div>
          <div className="emp-mini-value">{sec.lowTurnover}</div>
        </div>
        <div className="emp-mini-card">
          <div className="emp-mini-label">Total leads</div>
          <div className="emp-mini-value">{sec.totalLeads}</div>
        </div>
      </div>

      <div className="emp-tabs-row">
        <button
          type="button"
          className={`emp-tab ${listTab === 'active' ? 'active' : ''}`}
          onClick={() => setListTab('active')}
        >
          Active Employees ({s.activeCount})
        </button>
        <button
          type="button"
          className={`emp-tab ${listTab === 'inactive' ? 'active' : ''}`}
          onClick={() => setListTab('inactive')}
        >
          Inactive Employees ({s.inactiveCount})
        </button>
      </div>

      <Panel>
        <FilterBar>
          <Input
            type="search"
            className="products-search"
            placeholder="Search by name, id, phone…"
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
          />
          <Select value={roleFilter} onChange={(ev) => setRoleFilter(ev.target.value)}>
            <option value="">All roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="telecaller">Telecaller</option>
            <option value="agronomist">Agronomist</option>
            <option value="operations">Operations</option>
            <option value="viewer">Viewer</option>
          </Select>
          {canWrite ? (
            <Btn variant="primary" onClick={() => setShowNewEmployee(true)}>
              + New employee
            </Btn>
          ) : null}
          <Btn variant="secondary">Filters</Btn>
          <Btn variant="secondary">Export</Btn>
        </FilterBar>

        <TableWrap>
          <DataTable>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Performance</th>
                <th>Turnover (mo)</th>
                <th>Leads</th>
                <th>Tasks</th>
                <th>Follow-ups</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div className="emp-table-user">
                        <span className="emp-table-avatar">{initials(e.fullName)}</span>
                        <div>
                          <strong>{e.fullName}</strong>
                          <small>
                            {e.employeeCode} · {e.email}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge tone="role">{roleLabel(e.role)}</Badge>
                    </td>
                    <td>
                      <span className={`perf-pill ${perfClass(e.performanceLabel)}`}>
                        {e.performanceScore} · {e.performanceLabel}
                      </span>
                    </td>
                    <td>{formatInrFull(e.turnoverInr)}</td>
                    <td>{e.totalLeads}</td>
                    <td>{e.pendingTasks}</td>
                    <td>{e.pendingFollowUpsToday}</td>
                    <td>
                      <span className={`status-dot ${e.statusOnline ? 'online' : ''}`}>
                        {e.statusOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Btn
                          size="sm"
                          variant="primary"
                          onClick={() => navigate(toPath(`${paths.employees}/${e.id}`))}
                        >
                          View
                        </Btn>
                        {canWrite ? (
                          <Btn size="sm" variant="secondary" onClick={() => setEditingEmployee(e)}>
                            Edit
                          </Btn>
                        ) : null}
                        {canWrite && e.active ? (
                          <Btn
                            size="sm"
                            variant="danger"
                            onClick={async () => {
                              if (!confirm(`Deactivate ${e.fullName}?`)) return;
                              await deactivateEmployee(e.id);
                            }}
                          >
                            Deactivate
                          </Btn>
                        ) : null}
                        {canWrite ? (
                          <Btn
                            size="sm"
                            variant="secondary"
                            onClick={async () => {
                              await sendResetLink(e.id);
                              alert('Password reset link sent.');
                            }}
                          >
                            Password Reset Mail Sent
                          </Btn>
                        ) : null}
                        <Btn
                          size="sm"
                          variant="secondary"
                          onClick={() => window.print()}
                        >
                          Monthly Payout Print
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9}>
                    <EmptyState>No employees in this view</EmptyState>
                  </td>
                </tr>
              )}
            </tbody>
          </DataTable>
        </TableWrap>
      </Panel>
      {showNewEmployee ? (
        <NewEmployeeModal
          onClose={() => setShowNewEmployee(false)}
          onCreated={async () => {
            setShowNewEmployee(false);
            await loadWorkspace();
          }}
          createEmployee={createEmployee}
        />
      ) : null}
      {editingEmployee ? (
        <EditEmployeeModal
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSaved={async () => {
            setEditingEmployee(null);
            await loadWorkspace();
          }}
          updateEmployee={updateEmployee}
        />
      ) : null}
    </div>
  );
}

function NewEmployeeModal({
  onClose,
  onCreated,
  createEmployee,
}: {
  onClose: () => void;
  onCreated: () => Promise<void>;
  createEmployee: (input: {
    fullName: string;
    email: string;
    role: string;
    status: 'active' | 'inactive';
    personalMobile?: string;
    companyWhatsapp?: string;
    alternateMobile?: string;
    gender?: string;
    dateOfBirth?: string;
    joiningDate?: string;
    department?: string;
    reportingManagerId?: string | null;
    employmentType?: string;
    state?: string;
    district?: string;
    taluk?: string;
    address?: string;
    languages?: string[];
    cropsExpertise?: string[];
    diseaseKnowledgeRating?: number;
    whatsappSkillRating?: number;
    customerHandlingRating?: number;
    fieldExperienceYears?: number;
    compensation?: Record<string, unknown>;
    attendanceRules?: Record<string, unknown>;
  }) => Promise<void>;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [active, setActive] = useState(true);
  const [personalMobile, setPersonalMobile] = useState('');
  const [companyWhatsapp, setCompanyWhatsapp] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [gender, setGender] = useState('male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [department, setDepartment] = useState('Operations');
  const [employmentType, setEmploymentType] = useState('full_time');
  const [state, setState] = useState('Kerala');
  const [district, setDistrict] = useState('');
  const [taluk, setTaluk] = useState('');
  const [address, setAddress] = useState('');
  const [languages, setLanguages] = useState<string[]>(['English']);
  const [cropsExpertise, setCropsExpertise] = useState<string[]>([]);
  const [diseaseKnowledgeRating, setDiseaseKnowledgeRating] = useState(70);
  const [whatsappSkillRating, setWhatsappSkillRating] = useState(70);
  const [customerHandlingRating, setCustomerHandlingRating] = useState(70);
  const [fieldExperienceYears, setFieldExperienceYears] = useState(0);
  const [fixedSalary, setFixedSalary] = useState(30000);
  const [incentiveEnabled, setIncentiveEnabled] = useState(true);
  const [monthlySalesTarget, setMonthlySalesTarget] = useState(300000);
  const [incentivePct, setIncentivePct] = useState(2);
  const [conversionTarget, setConversionTarget] = useState(50);
  const [additionalBonus, setAdditionalBonus] = useState(1000);
  const [travelAllowance, setTravelAllowance] = useState(0);
  const [joiningBonus, setJoiningBonus] = useState(0);
  const [minDailyHours, setMinDailyHours] = useState(9);
  const [monthlyWorkingDays, setMonthlyWorkingDays] = useState(23);
  const [workingWindowStart, setWorkingWindowStart] = useState('08:00');
  const [workingWindowEnd, setWorkingWindowEnd] = useState('19:00');
  const [idleWarningMinutes, setIdleWarningMinutes] = useState(45);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setError('');
    try {
      await createEmployee({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        role,
        status: active ? 'active' : 'inactive',
        personalMobile: personalMobile.trim() || undefined,
        companyWhatsapp: companyWhatsapp.trim() || undefined,
        alternateMobile: alternateMobile.trim() || undefined,
        gender,
        dateOfBirth: dateOfBirth || undefined,
        joiningDate: joiningDate || undefined,
        department,
        employmentType,
        state,
        district: district.trim() || undefined,
        taluk: taluk.trim() || undefined,
        address: address.trim() || undefined,
        languages,
        cropsExpertise,
        diseaseKnowledgeRating,
        whatsappSkillRating,
        customerHandlingRating,
        fieldExperienceYears,
        compensation: {
          fixed_salary: fixedSalary,
          incentive_enabled: incentiveEnabled,
          salary_cycle: 'monthly',
          joining_bonus: joiningBonus,
          travel_allowance: travelAllowance,
          monthly_sales_target: monthlySalesTarget,
          incentive_pct_after_target: incentivePct,
          conversion_target_pct: conversionTarget,
          additional_bonus_after_conversion: additionalBonus,
          conversion_bonus_enabled: true,
        },
        attendanceRules: {
          min_daily_hours: minDailyHours,
          monthly_working_days: monthlyWorkingDays,
          working_window_start: workingWindowStart,
          working_window_end: workingWindowEnd,
          idle_warning_threshold_minutes: idleWarningMinutes,
        },
      });
      await onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create employee');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New employee" onClose={onClose} onSave={save} saveLabel="Create" saving={saving}>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-800">Basic Information</h4>
        <Field label="Full name">
          <input
            className={inputClass}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Asha Nair"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="asha@morbeez.in"
          />
        </Field>
        <Field label="Role">
          <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="operations">Operations</option>
            <option value="telecaller">Telecaller</option>
            <option value="agronomist">Agronomist</option>
            <option value="manager">Manager</option>
            <option value="viewer">Viewer</option>
          </select>
        </Field>
        <Field label="Personal mobile">
          <input className={inputClass} value={personalMobile} onChange={(e) => setPersonalMobile(e.target.value)} />
        </Field>
        <Field label="Company WhatsApp">
          <input className={inputClass} value={companyWhatsapp} onChange={(e) => setCompanyWhatsapp(e.target.value)} />
        </Field>
        <Field label="Alternate number">
          <input className={inputClass} value={alternateMobile} onChange={(e) => setAlternateMobile(e.target.value)} />
        </Field>
        <Field label="Gender">
          <select className={inputClass} value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Date of birth">
          <input type="date" className={inputClass} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
        </Field>
        <Field label="Joining date">
          <input type="date" className={inputClass} value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
        </Field>
        <h4 className="text-sm font-semibold text-slate-800">Role & Department</h4>
        <Field label="Department">
          <input className={inputClass} value={department} onChange={(e) => setDepartment(e.target.value)} />
        </Field>
        <Field label="Employment type">
          <select className={inputClass} value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
            <option value="full_time">Full-time</option>
            <option value="contract">Contract</option>
            <option value="part_time">Part-time</option>
          </select>
        </Field>
        <h4 className="text-sm font-semibold text-slate-800">Location & Languages</h4>
        <Field label="State">
          <input className={inputClass} value={state} onChange={(e) => setState(e.target.value)} />
        </Field>
        <Field label="District">
          <input className={inputClass} value={district} onChange={(e) => setDistrict(e.target.value)} />
        </Field>
        <Field label="Taluk">
          <input className={inputClass} value={taluk} onChange={(e) => setTaluk(e.target.value)} />
        </Field>
        <Field label="Address">
          <textarea className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="Languages">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {['Malayalam', 'Tamil', 'Kannada', 'English', 'Hindi'].map((lang) => (
              <label key={lang} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={languages.includes(lang)}
                  onChange={(e) =>
                    setLanguages((prev) =>
                      e.target.checked ? [...prev, lang] : prev.filter((x) => x !== lang)
                    )
                  }
                />
                {lang}
              </label>
            ))}
          </div>
        </Field>
        <h4 className="text-sm font-semibold text-slate-800">Agriculture Skills</h4>
        <Field label="Crops expertise">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {['Ginger', 'Banana', 'Cardamom', 'Pepper', 'Vegetables'].map((crop) => (
              <label key={crop} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cropsExpertise.includes(crop)}
                  onChange={(e) =>
                    setCropsExpertise((prev) =>
                      e.target.checked ? [...prev, crop] : prev.filter((x) => x !== crop)
                    )
                  }
                />
                {crop}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Disease knowledge rating">
          <input type="number" className={inputClass} value={diseaseKnowledgeRating} onChange={(e) => setDiseaseKnowledgeRating(Number(e.target.value || 0))} />
        </Field>
        <Field label="WhatsApp communication skill">
          <input type="number" className={inputClass} value={whatsappSkillRating} onChange={(e) => setWhatsappSkillRating(Number(e.target.value || 0))} />
        </Field>
        <Field label="Customer handling skill">
          <input type="number" className={inputClass} value={customerHandlingRating} onChange={(e) => setCustomerHandlingRating(Number(e.target.value || 0))} />
        </Field>
        <Field label="Field experience years">
          <input type="number" className={inputClass} value={fieldExperienceYears} onChange={(e) => setFieldExperienceYears(Number(e.target.value || 0))} />
        </Field>
        <h4 className="text-sm font-semibold text-slate-800">Salary & Incentives</h4>
        <Field label="Fixed salary">
          <input type="number" className={inputClass} value={fixedSalary} onChange={(e) => setFixedSalary(Number(e.target.value || 0))} />
        </Field>
        <Field label="Monthly sales target">
          <input type="number" className={inputClass} value={monthlySalesTarget} onChange={(e) => setMonthlySalesTarget(Number(e.target.value || 0))} />
        </Field>
        <Field label="Incentive % after target">
          <input type="number" className={inputClass} value={incentivePct} onChange={(e) => setIncentivePct(Number(e.target.value || 0))} />
        </Field>
        <Field label="Conversion target %">
          <input type="number" className={inputClass} value={conversionTarget} onChange={(e) => setConversionTarget(Number(e.target.value || 0))} />
        </Field>
        <Field label="Additional bonus after conversion">
          <input type="number" className={inputClass} value={additionalBonus} onChange={(e) => setAdditionalBonus(Number(e.target.value || 0))} />
        </Field>
        <Field label="Joining bonus">
          <input type="number" className={inputClass} value={joiningBonus} onChange={(e) => setJoiningBonus(Number(e.target.value || 0))} />
        </Field>
        <Field label="Travel allowance">
          <input type="number" className={inputClass} value={travelAllowance} onChange={(e) => setTravelAllowance(Number(e.target.value || 0))} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={incentiveEnabled} onChange={(e) => setIncentiveEnabled(e.target.checked)} />
          Incentive enabled
        </label>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <div>Estimated Monthly Earnings</div>
          <div>Fixed Salary: {formatInrFull(fixedSalary)}</div>
          <div>Estimated Incentive: {formatInrFull(Math.round((monthlySalesTarget * incentivePct) / 10000))}</div>
          <strong>
            Estimated Total: {formatInrFull(fixedSalary + Math.round((monthlySalesTarget * incentivePct) / 10000))}
          </strong>
        </div>
        <h4 className="text-sm font-semibold text-slate-800">Attendance Rules</h4>
        <Field label="Minimum daily hours">
          <input type="number" className={inputClass} value={minDailyHours} onChange={(e) => setMinDailyHours(Number(e.target.value || 0))} />
        </Field>
        <Field label="Monthly working days">
          <input type="number" className={inputClass} value={monthlyWorkingDays} onChange={(e) => setMonthlyWorkingDays(Number(e.target.value || 0))} />
        </Field>
        <Field label="Working window start">
          <input type="time" className={inputClass} value={workingWindowStart} onChange={(e) => setWorkingWindowStart(e.target.value)} />
        </Field>
        <Field label="Working window end">
          <input type="time" className={inputClass} value={workingWindowEnd} onChange={(e) => setWorkingWindowEnd(e.target.value)} />
        </Field>
        <Field label="Idle warning threshold (minutes)">
          <input type="number" className={inputClass} value={idleWarningMinutes} onChange={(e) => setIdleWarningMinutes(Number(e.target.value || 0))} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active account
        </label>
      </div>
    </Modal>
  );
}

function EditEmployeeModal({
  employee,
  onClose,
  onSaved,
  updateEmployee,
}: {
  employee: Employee;
  onClose: () => void;
  onSaved: () => Promise<void>;
  updateEmployee: (
    id: string,
    input: { fullName?: string; role?: string; active?: boolean }
  ) => Promise<void>;
}) {
  const [fullName, setFullName] = useState(employee.fullName);
  const [role, setRole] = useState(employee.role);
  const [active, setActive] = useState(employee.active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setError('');
    try {
      await updateEmployee(employee.id, {
        fullName: fullName.trim(),
        role,
        active,
      });
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update employee');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit employee" onClose={onClose} onSave={save} saveLabel="Update" saving={saving}>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="space-y-3">
        <Field label="Full name">
          <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Role">
          <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="operations">Operations</option>
            <option value="telecaller">Telecaller</option>
            <option value="agronomist">Agronomist</option>
            <option value="manager">Manager</option>
            <option value="viewer">Viewer</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active account
        </label>
      </div>
    </Modal>
  );
}
