import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { paths, toPath } from '../lib/routes';
import { formatInrFull, initials, roleLabel } from '../lib/format';
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

export function EmployeesPage() {
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
        ) : (
          <Panel title={detailTab}>
            <p className="muted">Detailed {detailTab} analytics coming soon.</p>
          </Panel>
        )}
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
                      <Btn
                        size="sm"
                        variant="primary"
                        onClick={() => navigate(toPath(`${paths.employees}/${e.id}`))}
                      >
                        View
                      </Btn>
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
    </div>
  );
}
