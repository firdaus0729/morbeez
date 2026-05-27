import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { LeadDetailPanel } from '../components/telecaller/LeadDetailPanel';
import { EscalationsPanel } from '../components/telecaller/EscalationsPanel';
import { Field, Modal, inputClass } from '../components/Modal';
import { Alert, Btn, HubTabs, Loading, ReadOnlyBanner } from '../components/ui';
const STAGE_CLASS: Record<string, string> = {
  new_lead: 'stage-new',
  interested: 'stage-interested',
  follow_up: 'stage-follow',
  recommendation: 'stage-rec',
  order_placed: 'stage-order',
  repeat_customer: 'stage-repeat',
};

type Overview = {
  callsToday: number;
  pendingFollowUps: number;
  interestedFarmers: number;
  myLeadsCount: number;
  allLeadsCount: number;
};

type LeadRow = {
  id: string;
  farmerName: string;
  farmerInitials: string;
  phone: string | null;
  stageLabel: string;
  stage: string;
  district: string | null;
  lastInteractionLabel: string | null;
  followUpLabel?: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  dueLabel?: string;
  leadId?: string;
  farmerName?: string;
};

type CrmView = 'workspace' | 'escalations';

export function TelecallerCrmPage({ canWrite }: { canWrite: boolean }) {
  const [crmView, setCrmView] = useState<CrmView>('workspace');
  const [pendingEscalations, setPendingEscalations] = useState(0);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [counts, setCounts] = useState({ mine: 0, all: 0 });
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [stage, setStage] = useState('');
  const [search, setSearch] = useState('');
  const [showTasks, setShowTasks] = useState(false);
  const [showNewLead, setShowNewLead] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const base = '/console/api/v1/os/telecaller';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        scope,
        page: '1',
        limit: '40',
        ...(stage ? { stage } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      });
      const [ov, leadRes, taskRes, badges] = await Promise.all([
        api<{ ok: boolean; overview: Overview }>(`${base}/overview`),
        api<{ ok: boolean; leads: LeadRow[]; counts: { mine: number; all: number } }>(
          `${base}/leads?${params}`
        ),
        api<{ ok: boolean; tasks: TaskRow[] }>(`${base}/tasks?status=pending`),
        api<{ ok: boolean; badges: { pendingEscalations?: number } }>(`${base}/nav-badges`).catch(
          () => ({ ok: true, badges: { pendingEscalations: 0 } })
        ),
      ]);
      setPendingEscalations(badges.badges.pendingEscalations ?? 0);
      setOverview(ov.overview);
      setLeads(leadRes.leads ?? []);
      setCounts(leadRes.counts ?? { mine: 0, all: 0 });
      setTasks(taskRes.tasks ?? []);
      setSelectedLeadId((prev) => {
        if (prev && leadRes.leads?.some((l) => l.id === prev)) return prev;
        return leadRes.leads?.[0]?.id ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load CRM');
    } finally {
      setLoading(false);
    }
  }, [scope, stage, search]);

  useEffect(() => {
    load();
  }, [scope, stage]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [search]);

  async function completeTask(taskId: string) {
    if (!canWrite) return;
    try {
      await api(`${base}/tasks/${taskId}/complete`, { method: 'PATCH', body: '{}' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not complete task');
    }
  }

  return (
    <div className="telecaller-page">
      <div className="filter-bar">
        {canWrite ? (
          <Btn variant="primary" onClick={() => setShowNewLead(true)}>
            + New lead
          </Btn>
        ) : null}
      </div>

      {!canWrite ? <ReadOnlyBanner /> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      {overview ? (
        <div className="tc-kpi-grid">
          <div className="tc-kpi-card">
            <span className="tc-kpi-label">My leads</span>
            <div className="tc-kpi-row">
              <span className="tc-kpi-value">{overview.myLeadsCount}</span>
            </div>
          </div>
          <div className="tc-kpi-card">
            <span className="tc-kpi-label">Follow-ups</span>
            <div className="tc-kpi-row">
              <span className="tc-kpi-value">{overview.pendingFollowUps}</span>
            </div>
          </div>
          <div className="tc-kpi-card">
            <span className="tc-kpi-label">Calls today</span>
            <div className="tc-kpi-row">
              <span className="tc-kpi-value">{overview.callsToday}</span>
            </div>
          </div>
          <div className="tc-kpi-card">
            <span className="tc-kpi-label">Interested</span>
            <div className="tc-kpi-row">
              <span className="tc-kpi-value">{overview.interestedFarmers}</span>
            </div>
          </div>
        </div>
      ) : null}

      <HubTabs
        tabs={[
          { id: 'workspace' as const, label: 'Workspace' },
          { id: 'escalations' as const, label: 'Escalations', badge: pendingEscalations },
        ]}
        active={crmView}
        onChange={setCrmView}
      />

      {crmView === 'escalations' ? <EscalationsPanel canWrite={canWrite} /> : null}

      {crmView === 'workspace' && showNewLead && canWrite ? (
        <NewLeadModal
          onClose={() => setShowNewLead(false)}
          onCreated={(id) => {
            setShowNewLead(false);
            setSelectedLeadId(id);
            load();
          }}
        />
      ) : null}

      {crmView === 'workspace' ? (
        <div className="tc-workspace-shell">
          <div className="tc-workspace-split">
            <div className="tc-leads-pane">
              <div className="tc-leads-toolbar">
                <div className="tc-scope-tabs">
                  <button
                    type="button"
                    className={`tc-scope-tab ${scope === 'mine' ? 'active' : ''}`}
                    onClick={() => setScope('mine')}
                  >
                    My Leads ({counts.mine})
                  </button>
                  <button
                    type="button"
                    className={`tc-scope-tab ${scope === 'all' ? 'active' : ''}`}
                    onClick={() => setScope('all')}
                  >
                    All Leads ({counts.all})
                  </button>
                </div>
                <div className="tc-leads-filters">
                  <select
                    className="products-select"
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                  >
                    <option value="">All stages</option>
                    <option value="new_lead">New Lead</option>
                    <option value="interested">Interested</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="recommendation">Recommendation</option>
                    <option value="order_placed">Order Placed</option>
                  </select>
                  <input
                    type="search"
                    className="products-search tc-lead-search"
                    placeholder="Search leads…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Btn size="sm" variant="secondary" onClick={() => setShowTasks((v) => !v)}>
                    Tasks ({tasks.length})
                  </Btn>
                </div>
              </div>

              {showTasks ? (
                <div className="panel-body" style={{ maxHeight: 160, overflow: 'auto' }}>
                  {tasks.map((t) => (
                    <div key={t.id} className="emp-list-item">
                      <strong>{t.title}</strong>
                      {t.dueLabel ? <div className="muted">{t.dueLabel}</div> : null}
                      <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                        {t.leadId ? (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedLeadId(t.leadId!)}>
                            Open
                          </button>
                        ) : null}
                        {canWrite ? (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => completeTask(t.id)}>
                            Done
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="table-wrap tc-leads-table-wrap">
                {loading ? (
                  <Loading label="Loading leads…" />
                ) : (
                  <table className="products-table tc-leads-table">
                    <thead>
                      <tr>
                        <th>Farmer</th>
                        <th>Stage</th>
                        <th className="tc-hide-sm">Last interaction</th>
                        <th>Follow-up</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => (
                        <tr
                          key={lead.id}
                          className={`tc-lead-row ${selectedLeadId === lead.id ? 'selected' : ''}`}
                          onClick={() => setSelectedLeadId(lead.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="tc-col-farmer">
                            <span className="tc-avatar-sm">{lead.farmerInitials}</span>
                            <div>
                              <strong>{lead.farmerName}</strong>
                              <small>{lead.phone ?? ''}</small>
                            </div>
                          </td>
                          <td>
                            <span className={`tc-stage ${STAGE_CLASS[lead.stage] ?? 'stage-new'}`}>
                              {lead.stageLabel}
                            </span>
                          </td>
                          <td className="tc-muted tc-hide-sm">{lead.lastInteractionLabel ?? '—'}</td>
                          <td>{lead.followUpLabel ?? '—'}</td>
                        </tr>
                      ))}
                      {!leads.length ? (
                        <tr>
                          <td colSpan={4} className="empty-state">
                            No leads in this view
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <aside className="tc-detail-drawer">
              <div className="tc-detail-pane">
                {selectedLeadId ? (
                  <LeadDetailPanel key={selectedLeadId} leadId={selectedLeadId} canWrite={canWrite} />
                ) : (
                  <div className="tc-detail-empty">
                    <p>Select a lead from the list to view profile and tabs</p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NewLeadModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (leadId: string) => void;
}) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [cropType, setCropType] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setError('');
    try {
      const res = await api<{ ok: boolean; lead: { id: string } }>(
        '/console/api/v1/os/telecaller/leads',
        {
          method: 'POST',
          body: JSON.stringify({
            phone: phone.trim(),
            name: name.trim() || undefined,
            district: district.trim() || undefined,
            cropType: cropType.trim() || undefined,
          }),
        }
      );
      onCreated(res.lead.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create lead');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New lead" onClose={onClose} onSave={save} saving={saving}>
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <div className="space-y-3">
        <Field label="Phone (10 digits)">
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Farmer name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="District">
          <input className={inputClass} value={district} onChange={(e) => setDistrict(e.target.value)} />
        </Field>
        <Field label="Crop">
          <input className={inputClass} value={cropType} onChange={(e) => setCropType(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

