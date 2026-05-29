import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTelecallerHeader } from '../context/TelecallerHeaderContext';
import { api } from '../lib/api';
import { LeadDetailPanel } from '../components/telecaller/LeadDetailPanel';
import { EscalationsPanel } from '../components/telecaller/EscalationsPanel';
import { Field, Modal, inputClass } from '../components/Modal';
import {
  CropBlockFields,
  emptyCropBlock,
  toApiCropBlock,
  type CropBlockFormValue,
} from '../components/telecaller/CropBlockFields';
import { Alert, Btn, HubTabs, Loading, ReadOnlyBanner } from '../components/ui';
import { getRealtimeClient } from '../lib/realtime';
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
type CrmNotification = { id: string; message: string; at: string };

export function TelecallerCrmPage({ canWrite }: { canWrite: boolean }) {
  const { patchHeader } = useTelecallerHeader();
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
  const [notifications, setNotifications] = useState<CrmNotification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const base = '/morbeez-staff/api/v1/os/telecaller';

  const pushNotification = useCallback((message: string) => {
    const at = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    setNotifications((prev) => [{ id: `${Date.now()}-${Math.random()}`, message, at }, ...prev.slice(0, 19)]);
    setUnreadNotifications((v) => v + 1);
  }, []);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
      setError('');
    }
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
      if (!opts?.silent) setError(e instanceof Error ? e.message : 'Failed to load CRM');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [scope, stage, search]);

  useEffect(() => {
    load();
  }, [scope, stage]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [search]);

  const realtimeClient = useMemo(() => getRealtimeClient(), []);

  useEffect(() => {
    if (!realtimeClient) return;

    const leadsChannel = realtimeClient
      .channel('telecaller-leads-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          const eventType = payload.eventType;
          if (eventType === 'INSERT') pushNotification('New lead added.');
          else if (eventType === 'UPDATE') pushNotification('Lead updated.');
          else if (eventType === 'DELETE') pushNotification('Lead deleted.');
          void load({ silent: true });
        }
      )
      .subscribe();

    const tasksChannel = realtimeClient
      .channel('telecaller-tasks-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') pushNotification('New follow-up task assigned.');
          if (payload.eventType === 'UPDATE') pushNotification('Task updated.');
          void load({ silent: true });
        }
      )
      .subscribe();

    return () => {
      void realtimeClient.removeChannel(leadsChannel);
      void realtimeClient.removeChannel(tasksChannel);
    };
  }, [realtimeClient, load, pushNotification]);

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) ?? null,
    [leads, selectedLeadId]
  );

  useEffect(() => {
    patchHeader({
      search,
      setSearch,
      canWrite,
      onAddLead: () => setShowNewLead(true),
      selectedPhone: selectedLead?.phone ?? null,
      unreadNotifications,
      notifications,
      showNotifications,
      setShowNotifications,
      onToggleNotifications: () => {
        setShowNotifications((v) => {
          if (!v) setUnreadNotifications(0);
          return !v;
        });
      },
    });
  }, [
    patchHeader,
    search,
    canWrite,
    selectedLead?.phone,
    unreadNotifications,
    notifications,
    showNotifications,
  ]);

  async function completeTask(taskId: string) {
    if (!canWrite) return;
    try {
      await api(`${base}/tasks/${taskId}/complete`, { method: 'PATCH', body: '{}' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not complete task');
    }
  }

  async function deleteLead(lead: LeadRow) {
    if (!canWrite) return;
    const ok = confirm(`Delete lead "${lead.farmerName}"? This will remove the lead from database.`);
    if (!ok) return;
    try {
      await api(`${base}/leads/${lead.id}`, { method: 'DELETE' });
      if (selectedLeadId === lead.id) {
        setSelectedLeadId(null);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete lead');
    }
  }

  return (
    <div className="telecaller-page">
      {showNotifications ? (
        <div className="tc-notification-panel">
          <h4>Notifications</h4>
          {notifications.length === 0 ? <p className="muted">No new notifications.</p> : null}
          {notifications.map((n) => (
            <div key={n.id} className="tc-notification-item">
              <strong>{n.message}</strong>
              <span>{n.at}</span>
            </div>
          ))}
        </div>
      ) : null}

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
                <div className="tc-toolbar-row tc-toolbar-row--primary">
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
                  <Btn
                    size="sm"
                    variant="secondary"
                    className={showTasks ? 'tc-tasks-toggle active' : 'tc-tasks-toggle'}
                    onClick={() => setShowTasks((v) => !v)}
                  >
                    Tasks ({tasks.length})
                  </Btn>
                </div>
                <div className="tc-toolbar-row tc-toolbar-row--filters">
                  <div className="tc-leads-filters">
                    <select
                      className="tc-filter-select"
                      value={stage}
                      onChange={(e) => setStage(e.target.value)}
                      aria-label="Filter by stage"
                    >
                      <option value="">All stages</option>
                      <option value="new_lead">New Lead</option>
                      <option value="interested">Interested</option>
                      <option value="follow_up">Follow-up</option>
                      <option value="recommendation">Recommendation</option>
                      <option value="order_placed">Order Placed</option>
                    </select>
                  </div>
                </div>
              </div>

              {showTasks ? (
                <div className="tc-tasks-panel">
                  {tasks.length === 0 ? (
                    <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                      No pending tasks
                    </p>
                  ) : (
                    tasks.map((t) => (
                      <div key={t.id} className="tc-task-item">
                        <div>
                          <strong>{t.title}</strong>
                          {t.dueLabel ? <div className="muted">{t.dueLabel}</div> : null}
                          {t.farmerName ? (
                            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                              {t.farmerName}
                            </div>
                          ) : null}
                        </div>
                        <div className="tc-task-actions">
                          {t.leadId ? (
                            <Btn size="sm" variant="ghost" onClick={() => setSelectedLeadId(t.leadId!)}>
                              Open
                            </Btn>
                          ) : null}
                          {canWrite ? (
                            <Btn size="sm" variant="primary" onClick={() => completeTask(t.id)}>
                              Done
                            </Btn>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : null}

              <div className="tc-lead-list">
                {loading ? (
                  <Loading label="Loading leads…" />
                ) : leads.length === 0 ? (
                  <p className="tc-leads-empty">No leads in this view</p>
                ) : (
                  leads.map((lead) => (
                    <div
                      key={lead.id}
                      className={`tc-lead-card ${selectedLeadId === lead.id ? 'selected' : ''}`}
                    >
                      <button
                        type="button"
                        className="tc-lead-card-select"
                        onClick={() => setSelectedLeadId(lead.id)}
                      >
                        <span className="tc-avatar-sm">{lead.farmerInitials}</span>
                        <div className="tc-lead-card-body">
                          <div className="tc-lead-card-top">
                            <strong>{lead.farmerName}</strong>
                            <span className={`tc-stage ${STAGE_CLASS[lead.stage] ?? 'stage-new'}`}>
                              {lead.stageLabel}
                            </span>
                          </div>
                          <div className="tc-lead-card-meta">
                            {lead.phone ?? 'No phone'}
                            {lead.district ? ` · ${lead.district}` : ''}
                          </div>
                          <div className="tc-lead-card-dates">
                            {lead.lastInteractionLabel ? (
                              <span>Last: {lead.lastInteractionLabel}</span>
                            ) : null}
                            {lead.followUpLabel ? <span>Follow-up: {lead.followUpLabel}</span> : null}
                          </div>
                        </div>
                      </button>
                      {canWrite ? (
                        <button
                          type="button"
                          className="tc-lead-delete-btn"
                          onClick={() => deleteLead(lead)}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  ))
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
  const base = '/morbeez-staff/api/v1/os/telecaller';
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [whatsappSame, setWhatsappSame] = useState(true);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [language, setLanguage] = useState('en');
  const [pincode, setPincode] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [village, setVillage] = useState('');
  const [totalAcreage, setTotalAcreage] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [deliveryPincode, setDeliveryPincode] = useState('');
  const [assignedCropAdvisor, setAssignedCropAdvisor] = useState('');
  const [roiEnabled, setRoiEnabled] = useState(true);
  const [farmerNotes, setFarmerNotes] = useState('');
  const [cropBlocks, setCropBlocks] = useState<CropBlockFormValue[]>([emptyCropBlock()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function lookupPincode(pc: string) {
    if (pc.replace(/\D/g, '').length !== 6) return;
    try {
      const res = await api<{ ok: boolean; pincode: { district: string; state: string } }>(
        `${base}/pincodes/${pc.replace(/\D/g, '')}`
      );
      setDistrict(res.pincode.district);
      setState(res.pincode.state);
    } catch {
      /* pincode may be added later in master */
    }
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const blocks = cropBlocks.map(toApiCropBlock).filter((b): b is NonNullable<typeof b> => Boolean(b));
      const res = await api<{ ok: boolean; lead: { id: string } }>(`${base}/leads`, {
        method: 'POST',
        body: JSON.stringify({
          phone: phone.trim(),
          name: name.trim() || undefined,
          district: district.trim() || undefined,
          state: state.trim() || undefined,
          cropType: blocks[0]?.cropName,
          whatsappSame,
          whatsappPhone: whatsappSame ? undefined : whatsappPhone.trim(),
          language,
          pincode: pincode.trim() || undefined,
          village: village.trim() || undefined,
          totalAcreage: totalAcreage.trim() ? Number(totalAcreage) : undefined,
          shippingAddress: shippingAddress.trim() || undefined,
          deliveryPincode: deliveryPincode.trim() || undefined,
          assignedCropAdvisor: assignedCropAdvisor.trim() || undefined,
          roiEnabled,
          farmerNotes: farmerNotes.trim() || undefined,
          cropBlocks: blocks.length ? blocks : undefined,
        }),
      });
      onCreated(res.lead.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create lead');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New farmer / lead" onClose={onClose} onSave={save} saving={saving}>
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">Basic details</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mobile (10 digits)">
              <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </Field>
            <Field label="Farmer name">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Language">
              <select className={inputClass} value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="en">English</option>
                <option value="ml">Malayalam</option>
                <option value="ta">Tamil</option>
                <option value="kn">Kannada</option>
                <option value="hi">Hindi</option>
              </select>
            </Field>
            <Field label="Pincode">
              <input
                className={inputClass}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                onBlur={() => void lookupPincode(pincode)}
                maxLength={6}
              />
            </Field>
            <Field label="District">
              <input className={inputClass} value={district} readOnly placeholder="Auto from pincode" />
            </Field>
            <Field label="State">
              <input className={inputClass} value={state} readOnly />
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={whatsappSame} onChange={(e) => setWhatsappSame(e.target.checked)} />
              WhatsApp same as mobile
            </label>
            {!whatsappSame ? (
              <Field label="WhatsApp number" className="sm:col-span-2">
                <input className={inputClass} value={whatsappPhone} onChange={(e) => setWhatsappPhone(e.target.value)} />
              </Field>
            ) : null}
          </div>
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">Farm & crops</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Village">
              <input className={inputClass} value={village} onChange={(e) => setVillage(e.target.value)} />
            </Field>
            <Field label="Total acreage">
              <input className={inputClass} value={totalAcreage} onChange={(e) => setTotalAcreage(e.target.value)} />
            </Field>
          </div>
          <CropBlockFields blocks={cropBlocks} onChange={setCropBlocks} />
          <button
            type="button"
            className="mt-2 text-xs text-emerald-700"
            onClick={() => setCropBlocks([...cropBlocks, emptyCropBlock()])}
          >
            + Add crop block
          </button>
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">Shipping & optional</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Shipping address" className="sm:col-span-2">
              <textarea
                className={inputClass}
                rows={2}
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
              />
            </Field>
            <Field label="Delivery pincode">
              <input className={inputClass} value={deliveryPincode} onChange={(e) => setDeliveryPincode(e.target.value)} />
            </Field>
            <Field label="Crop advisor (email)">
              <input className={inputClass} value={assignedCropAdvisor} onChange={(e) => setAssignedCropAdvisor(e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={roiEnabled} onChange={(e) => setRoiEnabled(e.target.checked)} />
              ROI enabled (WhatsApp tracker)
            </label>
            <Field label="Notes" className="sm:col-span-2">
              <textarea className={inputClass} rows={2} value={farmerNotes} onChange={(e) => setFarmerNotes(e.target.value)} />
            </Field>
          </div>
        </section>
      </div>
    </Modal>
  );
}

