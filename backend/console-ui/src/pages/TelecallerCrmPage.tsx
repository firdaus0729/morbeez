import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { LeadDetailPanel } from '../components/telecaller/LeadDetailPanel';
import { EscalationsPanel } from '../components/telecaller/EscalationsPanel';
import { Field, Modal, inputClass } from '../components/Modal';

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
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Telecaller CRM</h1>
          <p className="text-sm text-slate-600">Leads, farmer profiles, blocks with DAP, and WhatsApp</p>
        </div>
        {canWrite ? (
          <button
            type="button"
            onClick={() => setShowNewLead(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + New lead
          </button>
        ) : null}
        {overview ? (
          <div className="flex flex-wrap gap-3 text-center text-xs">
            <Stat label="My leads" value={overview.myLeadsCount} />
            <Stat label="Follow-ups" value={overview.pendingFollowUps} />
            <Stat label="Calls today" value={overview.callsToday} />
            <Stat label="Interested" value={overview.interestedFarmers} />
          </div>
        ) : null}
      </div>

      {!canWrite ? (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Read-only — you can view leads and messages but cannot edit stages or send WhatsApp.
        </p>
      ) : null}

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

      <div className="mb-4 flex gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setCrmView('workspace')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            crmView === 'workspace'
              ? 'bg-emerald-50 text-emerald-800'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Workspace
        </button>
        <button
          type="button"
          onClick={() => setCrmView('escalations')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            crmView === 'escalations'
              ? 'bg-emerald-50 text-emerald-800'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Escalations
          {pendingEscalations > 0 ? (
            <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">
              {pendingEscalations}
            </span>
          ) : null}
        </button>
      </div>

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
      <div className="flex min-h-0 flex-1 gap-4">
        <aside className="flex w-72 shrink-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-3">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setScope('mine')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${
                  scope === 'mine' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600'
                }`}
              >
                Mine ({counts.mine})
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${
                  scope === 'all' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600'
                }`}
              >
                All ({counts.all})
              </button>
            </div>
            <select
              className="mt-2 w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
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
              placeholder="Search name or phone…"
              className="mt-2 w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowTasks((v) => !v)}
              className="mt-2 w-full rounded-lg border border-slate-200 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
            >
              {showTasks ? 'Hide' : 'Show'} tasks ({tasks.length})
            </button>
          </div>

          {showTasks ? (
            <ul className="max-h-40 overflow-y-auto border-b border-slate-100 p-2 text-xs">
              {tasks.map((t) => (
                <li key={t.id} className="mb-2 rounded bg-slate-50 p-2">
                  <p className="font-medium">{t.title}</p>
                  {t.dueLabel ? <p className="text-slate-500">{t.dueLabel}</p> : null}
                  <div className="mt-1 flex gap-2">
                    {t.leadId ? (
                      <button
                        type="button"
                        className="text-emerald-700 hover:underline"
                        onClick={() => setSelectedLeadId(t.leadId!)}
                      >
                        Open
                      </button>
                    ) : null}
                    {canWrite ? (
                      <button
                        type="button"
                        className="text-slate-500 hover:underline"
                        onClick={() => completeTask(t.id)}
                      >
                        Done
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
              {tasks.length === 0 ? <li className="text-slate-500">No pending tasks</li> : null}
            </ul>
          ) : null}

          <ul className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <li className="p-4 text-center text-xs text-slate-500">Loading…</li>
            ) : (
              leads.map((lead) => (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`mb-1 w-full rounded-lg px-3 py-2 text-left ${
                      selectedLeadId === lead.id
                        ? 'bg-emerald-50 ring-1 ring-emerald-200'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold">
                        {lead.farmerInitials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{lead.farmerName}</p>
                        <p className="truncate text-xs text-slate-500">
                          {lead.stageLabel}
                          {lead.district ? ` · ${lead.district}` : ''}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))
            )}
            {!loading && leads.length === 0 ? (
              <li className="p-4 text-center text-xs text-slate-500">No leads match filters</li>
            ) : null}
          </ul>
        </aside>

        <main className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {selectedLeadId ? (
            <LeadDetailPanel key={selectedLeadId} leadId={selectedLeadId} canWrite={canWrite} />
          ) : (
            <p className="text-sm text-slate-500">Select a lead to view the farmer profile.</p>
          )}
        </main>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 min-w-[4.5rem]">
      <p className="text-lg font-semibold text-slate-900">{value}</p>
      <p className="text-slate-500">{label}</p>
    </div>
  );
}
