import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { api } from '../../lib/api';
import { CrmModals, type CrmModalType } from './CrmModals';
import { LeadExportMenu } from './LeadExportMenu';
import { openWhatsAppShare } from '../../lib/crmExport';

const STAGE_CLASS: Record<string, string> = {
  new_lead: 'stage-new',
  interested: 'stage-interested',
  follow_up: 'stage-follow',
  recommendation: 'stage-rec',
  order_placed: 'stage-order',
  repeat_customer: 'stage-repeat',
};

const STAGES = [
  { id: 'new_lead', label: 'New Lead' },
  { id: 'interested', label: 'Interested' },
  { id: 'follow_up', label: 'Follow-up' },
  { id: 'recommendation', label: 'Recommendation' },
  { id: 'order_placed', label: 'Order Placed' },
  { id: 'repeat_customer', label: 'Repeat Customer' },
] as const;

type Tab =
  | 'overview'
  | 'interactions'
  | 'whatsapp'
  | 'blocks'
  | 'findings'
  | 'agronomist'
  | 'pending_tasks'
  | 'escalations'
  | 'notes'
  | 'orders';

type LeadDetail = {
  lead: {
    id: string;
    farmerId: string;
    farmerName: string;
    farmerInitials: string;
    phone: string | null;
    district: string | null;
    state: string | null;
    stage: string;
    stageLabel: string;
    leadScore: number;
    notes: string | null;
  };
  farmer: {
    language: string;
    territory: string;
    crop: string;
    acreage: string;
    irrigation: string;
    soilType: string;
  };
  farmOverview: {
    totalBlocks: number;
    primaryCrop: string;
    blocks?: Array<{ id: string; name: string; cropType: string; acreage: unknown; isPrimary: boolean }>;
  };
  timeline: Array<{ id: string; type: string; title: string; detail: string; atLabel: string }>;
  nextFollowUp: { title: string; dueLabel: string; notes?: string } | null;
  orders: Array<{ label: string; amount: number; date: string }>;
};

type BlockRow = {
  id: string;
  name: string;
  cropName?: string;
  area?: string;
  plantingDate?: string;
  growthStageName?: string;
};

type Props = {
  leadId: string;
  canWrite: boolean;
};

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'interactions', label: 'Interactions' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'blocks', label: 'Blocks' },
  { id: 'findings', label: 'Field findings' },
  { id: 'agronomist', label: 'Agronomist' },
  { id: 'pending_tasks', label: 'Pending Tasks' },
  { id: 'escalations', label: 'Escalations' },
  { id: 'notes', label: 'Notes' },
  { id: 'orders', label: 'Orders' },
];

const TAB_ICONS: Record<Tab, string> = {
  overview: '◉',
  interactions: '☎',
  whatsapp: '🟢',
  blocks: '▦',
  findings: '🧪',
  agronomist: '🧑‍🌾',
  pending_tasks: '⏰',
  escalations: '⚠',
  notes: '📝',
  orders: '🛒',
};

export function LeadDetailPanel({ leadId, canWrite }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [blockWs, setBlockWs] = useState<{
    blockInfo?: { daysAfterPlanting?: number; crop?: string; growthStage?: string };
  } | null>(null);
  const [interactions, setInteractions] = useState<Array<Record<string, unknown>>>([]);
  const [recommendations, setRecommendations] = useState<Array<Record<string, unknown>>>([]);
  const [findings, setFindings] = useState<Array<Record<string, unknown>>>([]);
  const [pendingTasks, setPendingTasks] = useState<Array<Record<string, unknown>>>([]);
  const [escalations, setEscalations] = useState<Array<Record<string, unknown>>>([]);
  const [notesHistory, setNotesHistory] = useState<Array<Record<string, unknown>>>([]);
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [messages, setMessages] = useState<Array<Record<string, unknown>>>([]);
  const [modal, setModal] = useState<CrmModalType>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [session, setSession] = useState<Record<string, unknown> | null>(null);
  const [waText, setWaText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const base = '/console/api/v1/os/telecaller';

  const loadBlocks = useCallback(async () => {
    try {
      const b = await api<{ ok: boolean; blocks: BlockRow[] }>(`${base}/leads/${leadId}/blocks`);
      setBlocks(b.blocks ?? []);
    } catch {
      /* non-fatal */
    }
  }, [leadId]);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api<LeadDetail & { ok: boolean }>(`${base}/leads/${leadId}`);
      setDetail(d);
      await loadBlocks();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load lead');
    } finally {
      setLoading(false);
    }
  }, [leadId, loadBlocks]);

  const bumpData = useCallback(() => {
    setDataVersion((v) => v + 1);
    loadDetail();
  }, [loadDetail]);

  const loadTabData = useCallback(async () => {
    if (!detail) return;
    const farmerId = detail.lead.farmerId;
    try {
      if (tab === 'blocks') {
        const b = await api<{ ok: boolean; blocks: BlockRow[] }>(`${base}/leads/${leadId}/blocks`);
        const list = b.blocks ?? [];
        setBlocks(list);
        const firstId = list[0]?.id ?? null;
        setSelectedBlockId(firstId);
        if (firstId) {
          const ws = await api<{ ok: boolean; blockInfo?: { daysAfterPlanting?: number; crop?: string; growthStage?: string } }>(
            `${base}/leads/${leadId}/blocks/${firstId}/workspace`
          );
          setBlockWs(ws);
        }
      } else if (tab === 'interactions') {
        const ix = await api<{ ok: boolean; interactions: Array<Record<string, unknown>> }>(
          `${base}/leads/${leadId}/interactions`
        );
        setInteractions(ix.interactions ?? []);
      } else if (tab === 'agronomist') {
        const rec = await api<{ ok: boolean; recommendations: Array<Record<string, unknown>> }>(
          `${base}/leads/${leadId}/recommendations`
        );
        setRecommendations(rec.recommendations ?? []);
      } else if (tab === 'pending_tasks') {
        const t = await api<{ ok: boolean; tasks: Array<Record<string, unknown>> }>(`${base}/leads/${leadId}/tasks`);
        setPendingTasks(t.tasks ?? []);
      } else if (tab === 'findings') {
        const ff = await api<{ ok: boolean; findings: Array<Record<string, unknown>> }>(
          `${base}/leads/${leadId}/field-findings`
        );
        setFindings(ff.findings ?? []);
      } else if (tab === 'orders') {
        const ord = await api<{ ok: boolean; orders: Array<Record<string, unknown>> }>(
          `${base}/leads/${leadId}/orders`
        );
        setOrders(ord.orders ?? []);
      } else if (tab === 'whatsapp') {
        const [msg, sess] = await Promise.all([
          api<{ ok: boolean; messages: Array<Record<string, unknown>> }>(
            `${base}/whatsapp/${farmerId}/messages`
          ),
          api<{ ok: boolean; session: Record<string, unknown> | null }>(
            `${base}/whatsapp/${farmerId}/session`
          ),
        ]);
        setMessages(msg.messages ?? []);
        setSession(sess.session);
      } else if (tab === 'escalations') {
        const r = await api<{ ok: boolean; escalations: Array<Record<string, unknown>> }>(
          `${base}/leads/${leadId}/escalations`
        );
        setEscalations(r.escalations ?? []);
      } else if (tab === 'notes') {
        const r = await api<{ ok: boolean; notes: Array<Record<string, unknown>> }>(`${base}/leads/${leadId}/notes`);
        setNotesHistory(r.notes ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tab');
    }
  }, [tab, leadId, detail, dataVersion]);

  useEffect(() => {
    loadDetail();
    setTab('overview');
  }, [loadDetail]);

  useEffect(() => {
    if (detail && tab !== 'overview') loadTabData();
  }, [tab, detail, loadTabData, dataVersion]);

  async function changeStage(stage: string) {
    if (!canWrite) return;
    try {
      await api(`${base}/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ stage }),
      });
      await loadDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update stage');
    }
  }

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!canWrite || !noteText.trim()) return;
    try {
      await api(`${base}/leads/${leadId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: noteText.trim() }),
      });
      setNoteText('');
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save note');
    }
  }

  async function selectBlock(blockId: string) {
    setSelectedBlockId(blockId);
    try {
      const ws = await api<{ ok: boolean; blockInfo?: { daysAfterPlanting?: number; crop?: string; growthStage?: string } }>(
        `${base}/leads/${leadId}/blocks/${blockId}/workspace`
      );
      setBlockWs(ws);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load block');
    }
  }

  async function sendWhatsApp(e: FormEvent) {
    e.preventDefault();
    if (!canWrite || !detail || !waText.trim()) return;
    try {
      await api(`${base}/whatsapp/${detail.lead.farmerId}/send`, {
        method: 'POST',
        body: JSON.stringify({ text: waText.trim() }),
      });
      setWaText('');
      const msg = await api<{ ok: boolean; messages: Array<Record<string, unknown>> }>(
        `${base}/whatsapp/${detail.lead.farmerId}/messages`
      );
      setMessages(msg.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    }
  }

  async function convertToOrder(recId: string) {
    if (!canWrite) return;
    try {
      await api(`${base}/leads/${leadId}/recommendations/${recId}/convert-order`, {
        method: 'POST',
        body: '{}',
      });
      bumpData();
      setTab('orders');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create order');
    }
  }

  async function archiveResource(path: string, label: string) {
    if (!canWrite) return;
    if (!confirm(`Archive this ${label}?`)) return;
    try {
      await api(path, { method: 'DELETE' });
      bumpData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not archive ${label}`);
    }
  }

  async function patchSession(patch: Record<string, unknown>) {
    if (!canWrite || !detail) return;
    try {
      const res = await api<{ ok: boolean; session: Record<string, unknown> }>(
        `${base}/whatsapp/${detail.lead.farmerId}/session`,
        { method: 'PATCH', body: JSON.stringify(patch) }
      );
      setSession(res.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Session update failed');
    }
  }

  if (loading && !detail) {
    return <p className="tc-muted" style={{ padding: 24 }}>Loading farmer…</p>;
  }

  if (!detail) {
    return <p className="text-sm text-red-600" style={{ padding: 24 }}>{error || 'Lead not found'}</p>;
  }

  const l = detail.lead;
  const f = detail.farmer;
  const timeline = Array.isArray(detail.timeline) ? detail.timeline : [];
  const recentOrders = Array.isArray(detail.orders) ? detail.orders : [];
  const overviewBlocks = Array.isArray(detail.farmOverview?.blocks) ? detail.farmOverview.blocks : [];

  return (
    <div className="tc-detail-root">
      <header className="tc-detail-header">
        <div className="tc-detail-identity-row">
          <span className="tc-avatar-lg">{l.farmerInitials}</span>
          <div className="min-w-0 flex-1">
            <div className="tc-detail-topline">
              <h2>{l.farmerName}</h2>
              <span className="tc-customer-chip">Customer</span>
              <div className="tc-header-quick-actions">
                <button type="button" className="tc-icon-btn" aria-label="WhatsApp">🟢</button>
                <button type="button" className="tc-icon-btn" aria-label="Call">📞</button>
                <button type="button" className="tc-icon-btn" aria-label="More">⋯</button>
              </div>
              <button type="button" className="tc-call-btn">📞 Call</button>
              <button type="button" className="tc-note-btn" onClick={() => canWrite && setModal('task')}>
                ⊕ Add Note
              </button>
              <LeadExportMenu leadId={leadId} canShare={Boolean(l.phone)} />
            </div>
            <p className="tc-detail-subline">
              <strong>{l.phone ?? '—'}</strong> <span className="mx-2">•</span> {f.territory}{' '}
              <span className="mx-2">•</span> Pincode: 670645
            </p>
            {canWrite ? (
              <select
                className="tc-stage-select"
                value={l.stage}
                onChange={(e) => changeStage(e.target.value)}
                aria-label="Lead stage"
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className={`tc-stage ${STAGE_CLASS[l.stage] ?? 'stage-new'}`}>{l.stageLabel}</span>
            )}
          </div>
        </div>
        <nav className="tc-detail-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`tc-detail-tab ${tab === t.id ? 'active' : ''}`}
            >
              <span className="tc-tab-icon">{TAB_ICONS[t.id]}</span>
              {t.label}
            </button>
          ))}
        </nav>
        {canWrite ? (
          <div className="tc-detail-actions">
            <button type="button" className="tc-action-btn" onClick={() => setModal('call')}>
              Log call
            </button>
            <button type="button" className="tc-action-btn" onClick={() => setModal('task')}>
              Follow-up
            </button>
            <button type="button" className="tc-action-btn" onClick={() => setModal('visit')}>
              Schedule visit
            </button>
            <button type="button" className="tc-action-btn" onClick={() => setModal('order')}>
              New order
            </button>
          </div>
        ) : null}
      </header>

      {error ? <p className="text-sm text-red-600" style={{ padding: '12px 20px 0' }}>{error}</p> : null}

      {modal ? (
        <CrmModals
          type={modal}
          leadId={leadId}
          blocks={blocks}
          onClose={() => setModal(null)}
          onSaved={bumpData}
        />
      ) : null}

      <div className="tc-detail-body">
        {tab === 'overview' ? (
          <div className="tc-farmer-dashboard">
            <section className="tc-profile-summary">
              <article className="tc-profile-metric">
                <span>Total acres</span>
                <strong>{f.acreage || '—'}</strong>
              </article>
              <article className="tc-profile-metric">
                <span>Primary crop</span>
                <strong>{f.crop || '—'}</strong>
              </article>
              <article className="tc-profile-metric">
                <span>Farmer score</span>
                <strong>
                  {Math.round(Number(l.leadScore) * 20) || 0}
                  <small>/100</small>
                  <em className="tc-badge-high">High</em>
                </strong>
              </article>
              <article className="tc-profile-metric">
                <span>Relationship score</span>
                <strong>
                  {Math.min(100, Math.round(Number(l.leadScore) * 18 + 10))}
                  <small>/100</small>
                  <em className="tc-badge-strong">Strong</em>
                </strong>
              </article>
              <article className="tc-profile-metric">
                <span>Customer since</span>
                <strong>{timeline.length ? timeline[timeline.length - 1]?.atLabel ?? '—' : '—'}</strong>
              </article>
              <article className="tc-profile-metric">
                <span>Next follow-up</span>
                <strong>
                  {detail.nextFollowUp?.dueLabel ?? 'None'}
                  <em className="tc-badge-due">In 1 day</em>
                </strong>
              </article>
            </section>

            <section className="tc-dashboard-main-grid">
              <article className="tc-dashboard-card">
                <h3>Farmer overview</h3>
                <dl>
                  <Row label="Full Name" value={l.farmerName} />
                  <Row label="Territory" value={f.territory || '—'} />
                  <Row label="Language" value={f.language || '—'} />
                  <Row label="Phone" value={l.phone ?? '—'} />
                  <Row label="Irrigation" value={f.irrigation || '—'} />
                  <Row label="Soil" value={f.soilType || '—'} />
                </dl>
              </article>

              <article className="tc-dashboard-card">
                <h3>Recent orders</h3>
                <ul className="tc-compact-list">
                  {recentOrders.slice(0, 3).map((o, idx) => (
                    <li key={`${o.label}-${o.date}-${idx}`}>
                      <strong>{o.label || `Order ${idx + 1}`}</strong>
                      <span>₹{Number(o.amount ?? 0)}</span>
                    </li>
                  ))}
                  {recentOrders.length === 0 ? <li className="tc-empty-row">No recent orders</li> : null}
                </ul>
              </article>

              <article className="tc-dashboard-card">
                <h3>Upcoming follow-ups</h3>
                {detail.nextFollowUp ? (
                  <div className="tc-followup-block">
                    <p className="tc-followup-title">{detail.nextFollowUp.title}</p>
                    <p className="tc-followup-time">{detail.nextFollowUp.dueLabel}</p>
                  </div>
                ) : (
                  <p className="tc-empty-row">No follow-up scheduled</p>
                )}
                {canWrite ? (
                  <form onSubmit={addNote} className="mt-3 border-t border-slate-100 pt-3">
                    <label className="text-xs text-slate-600">Internal note</label>
                    <textarea
                      className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                      rows={2}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Call summary, farmer concern…"
                    />
                    <button
                      type="submit"
                      className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      Save note
                    </button>
                  </form>
                ) : null}
              </article>
            </section>

            <section className="tc-dashboard-card tc-blocks-summary">
              <div className="tc-card-head">
                <h3>Blocks summary</h3>
                <button type="button" className="tc-inline-link" onClick={() => setTab('blocks')}>
                  View all blocks
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Block</th>
                      <th className="px-3 py-2">Crop</th>
                      <th className="px-3 py-2">Area</th>
                      <th className="px-3 py-2">Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewBlocks.map((b) => (
                      <tr key={b.id} className="border-t border-slate-100">
                        <td className="px-3 py-2">{b.name}</td>
                        <td className="px-3 py-2">{b.cropType || '—'}</td>
                        <td className="px-3 py-2">{String(b.acreage ?? '—')}</td>
                        <td className="px-3 py-2">{b.isPrimary ? 'Primary' : 'Secondary'}</td>
                      </tr>
                    ))}
                    {overviewBlocks.length === 0 ? (
                      <tr>
                        <td className="px-3 py-4 text-slate-500" colSpan={4}>
                          No blocks found
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="tc-dashboard-footer-grid">
              <article className="tc-dashboard-card">
                <h3>Interaction summary</h3>
                <div className="tc-mini-kpis">
                  <div>
                    <span>Calls</span>
                    <strong>{timeline.filter((x) => String(x.type).toLowerCase().includes('call')).length}</strong>
                  </div>
                  <div>
                    <span>WhatsApp</span>
                    <strong>{timeline.filter((x) => String(x.type).toLowerCase().includes('whatsapp')).length}</strong>
                  </div>
                  <div>
                    <span>Recommendations</span>
                    <strong>{timeline.filter((x) => String(x.type).toLowerCase().includes('recommend')).length}</strong>
                  </div>
                </div>
              </article>
              <article className="tc-dashboard-card">
                <h3>AI insight</h3>
                <p className="text-sm text-slate-600">
                  {timeline[0]?.detail ??
                    'Keep follow-up cadence weekly and convert latest recommendation into order after confirmation.'}
                </p>
              </article>
              <article className="tc-dashboard-card">
                <h3>Suggested next action</h3>
                <ul className="tc-compact-list">
                  <li><strong>Call farmer for confirmation</strong><span>Today</span></li>
                  <li><strong>Share recommendation on WhatsApp</strong><span>Today</span></li>
                  <li><strong>Schedule field visit if needed</strong><span>This week</span></li>
                </ul>
              </article>
            </section>
          </div>
        ) : null}

        {tab === 'blocks' ? (
          <>
            {canWrite ? (
              <div className="mb-3">
                <ActionBtn onClick={() => setModal('block')}>+ Add block</ActionBtn>
              </div>
            ) : null}
          <div className="grid gap-4 lg:grid-cols-3">
            <ul className="space-y-2 lg:col-span-1">
              {blocks.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => selectBlock(b.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                      selectedBlockId === b.id
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-medium">{b.name}</span>
                    <span className="block text-xs text-slate-500">{b.cropName ?? '—'}</span>
                  </button>
                </li>
              ))}
              {blocks.length === 0 ? (
                <p className="text-sm text-slate-500">No farm blocks yet.</p>
              ) : null}
            </ul>
            {blockWs?.blockInfo ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm lg:col-span-2">
                <h3 className="font-medium">Block workspace</h3>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Row label="Crop" value={blockWs.blockInfo.crop ?? '—'} />
                  <Row
                    label="DAP"
                    value={
                      blockWs.blockInfo.daysAfterPlanting != null
                        ? `${blockWs.blockInfo.daysAfterPlanting} days`
                        : '—'
                    }
                  />
                  <Row label="Growth stage" value={blockWs.blockInfo.growthStage ?? '—'} />
                </dl>
              </div>
            ) : null}
          </div>
          </>
        ) : null}

        {tab === 'interactions' ? (
          <>
            {canWrite ? (
              <div className="mb-3">
                <ActionBtn onClick={() => setModal('interaction')}>+ Log interaction</ActionBtn>
              </div>
            ) : null}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Summary</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">When</th>
                    {canWrite ? <th className="px-4 py-3" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {interactions.map((r) => (
                    <tr key={String(r.id)} className="border-t border-slate-100">
                      <td className="px-4 py-3">{String(r.interactionType ?? r.type ?? '—')}</td>
                      <td className="px-4 py-3">{String(r.summary ?? r.notes ?? '—').slice(0, 80)}</td>
                      <td className="px-4 py-3">{String(r.status ?? '—')}</td>
                      <td className="px-4 py-3">{String(r.createdLabel ?? r.created_at ?? '—')}</td>
                      {canWrite ? (
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="text-xs text-red-600 hover:underline"
                            onClick={() =>
                              archiveResource(
                                `${base}/interactions/${String(r.id)}`,
                                'interaction'
                              )
                            }
                          >
                            Archive
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
              {interactions.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">
                  No cultivation interactions logged.
                </p>
              ) : null}
            </div>
          </>
        ) : null}

        {tab === 'agronomist' ? (
          <>
            {canWrite ? (
              <div className="mb-3">
                <ActionBtn onClick={() => setModal('recommendation')}>+ Add agronomist recommendation</ActionBtn>
              </div>
            ) : null}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Recommendation</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">When</th>
                    {canWrite ? <th className="px-4 py-3" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {recommendations.map((r) => (
                    <tr key={String(r.id)} className="border-t border-slate-100">
                      <td className="px-4 py-3">{String(r.recommendation ?? '—').slice(0, 100)}</td>
                      <td className="px-4 py-3">{String(r.status ?? '—')}</td>
                      <td className="px-4 py-3">{String(r.createdLabel ?? '—')}</td>
                      {canWrite ? (
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              className="text-xs text-emerald-700 hover:underline text-left"
                              onClick={() => convertToOrder(String(r.id))}
                            >
                              → Order
                            </button>
                            {l.phone ? (
                              <button
                                type="button"
                                className="text-xs text-slate-600 hover:underline text-left"
                                onClick={() =>
                                  openWhatsAppShare(leadId, {
                                    type: 'recommendation',
                                    recId: String(r.id),
                                  }).catch((e) =>
                                    setError(e instanceof Error ? e.message : 'Share failed')
                                  )
                                }
                              >
                                Share WA
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="text-xs text-red-600 hover:underline text-left"
                              onClick={() =>
                                archiveResource(
                                  `${base}/recommendations/${String(r.id)}`,
                                  'recommendation'
                                )
                              }
                            >
                              Archive
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
              {recommendations.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">No recommendations yet.</p>
              ) : null}
            </div>
          </>
        ) : null}

        {tab === 'findings' ? (
          <>
            {canWrite ? (
              <div className="mb-3">
                <ActionBtn onClick={() => setModal('finding')}>+ Add field finding</ActionBtn>
              </div>
            ) : null}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Visit</th>
                    <th className="px-4 py-3">Observations</th>
                    <th className="px-4 py-3">Severity</th>
                    {canWrite ? <th className="px-4 py-3" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {findings.map((r) => (
                    <tr key={String(r.id)} className="border-t border-slate-100">
                      <td className="px-4 py-3">{String(r.visitedLabel ?? r.visited_at ?? '—')}</td>
                      <td className="px-4 py-3">{String(r.observations ?? '—').slice(0, 100)}</td>
                      <td className="px-4 py-3">{String(r.severity ?? '—')}</td>
                      {canWrite ? (
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="text-xs text-red-600 hover:underline"
                            onClick={() =>
                              archiveResource(
                                `${base}/field-findings/${String(r.id)}`,
                                'field finding'
                              )
                            }
                          >
                            Archive
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
              {findings.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">No field findings.</p>
              ) : null}
            </div>
          </>
        ) : null}

        {tab === 'pending_tasks' ? (
          <DataTable
            headers={['Task', 'Due', 'Farmer', 'Status']}
            rows={pendingTasks.map((t) => [
              String(t.title ?? '—'),
              String(t.dueLabel ?? t.due_at ?? '—'),
              String(t.farmerName ?? '—'),
              String(t.status ?? 'pending'),
            ])}
            empty="No pending tasks."
          />
        ) : null}

        {tab === 'escalations' ? (
          <DataTable
            headers={['Case', 'Reason', 'Status', 'When']}
            rows={escalations.map((e) => [
              String(e.id ?? '—').slice(0, 8),
              String(e.reason ?? e.escalation_reason ?? 'Escalated case'),
              String(e.status ?? 'pending'),
              String(e.created_at ?? '—'),
            ])}
            empty="No active escalations for this farmer."
          />
        ) : null}

        {tab === 'notes' ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <h3 className="mb-2 font-medium text-slate-900">Internal notes</h3>
            <ul className="mb-3 space-y-2">
              {notesHistory.map((n) => (
                <li key={String(n.id)} className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                  <div className="text-xs text-slate-500">
                    {String(n.created_at ?? '—')} · {String(n.created_by ?? 'telecaller')}
                  </div>
                  <div>{String(n.note ?? n.content ?? '—')}</div>
                </li>
              ))}
              {!notesHistory.length ? <li className="text-slate-500">{l.notes ?? 'No saved notes yet.'}</li> : null}
            </ul>
            {canWrite ? (
              <form onSubmit={addNote}>
                <textarea
                  className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add note"
                />
                <button
                  type="submit"
                  className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  Save note
                </button>
              </form>
            ) : null}
          </div>
        ) : null}

        {tab === 'orders' ? (
          <>
            {canWrite ? (
              <div className="mb-3">
                <ActionBtn onClick={() => setModal('order')}>+ New order</ActionBtn>
              </div>
            ) : null}
            <DataTable
              headers={['Order', 'Product', 'Amount', 'Status', 'Date']}
              rows={orders.map((o) => [
                String(o.orderRef ?? o.id ?? '—'),
                String(o.product ?? '—'),
                `₹${Number(o.amount ?? 0)}`,
                String(o.status ?? '—'),
                String(o.dateLabel ?? '—'),
              ])}
              empty="No orders for this farmer."
            />
          </>
        ) : null}

        {tab === 'whatsapp' ? (
          <div className="tc-wa-layout">
            <div className="tc-wa-thread">
              <div className="tc-wa-messages">
                {messages.map((m) => {
                  const outbound = m.direction === 'outbound';
                  const raw = String(m.content ?? '').trim();
                  const isMedia =
                    !raw ||
                    /^(image|photo|audio|voice|document|video|sticker)$/i.test(raw) ||
                    raw.length < 3;
                  return (
                    <div
                      key={String(m.id)}
                      className={`tc-wa-bubble ${outbound ? 'tc-wa-bubble--out' : 'tc-wa-bubble--in'} ${
                        isMedia ? 'tc-wa-bubble--media' : ''
                      }`}
                    >
                      {isMedia ? (
                        <span>{raw ? `📎 ${raw}` : '📷 Media message'}</span>
                      ) : (
                        raw
                      )}
                      {m.created_at ? (
                        <time dateTime={String(m.created_at)}>
                          {new Date(String(m.created_at)).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      ) : null}
                    </div>
                  );
                })}
                {messages.length === 0 ? (
                  <p className="tc-muted" style={{ textAlign: 'center', padding: 24 }}>
                    No WhatsApp messages in log yet.
                  </p>
                ) : null}
              </div>
              {canWrite ? (
                <form onSubmit={sendWhatsApp} className="tc-wa-composer">
                  <input
                    value={waText}
                    onChange={(e) => setWaText(e.target.value)}
                    placeholder="Type a message…"
                    aria-label="WhatsApp message"
                  />
                  <button type="submit">Send</button>
                </form>
              ) : null}
            </div>
            <aside className="tc-wa-session">
              <h3>Session</h3>
              <label className="block text-xs text-slate-600">
                Owner
                <select
                  className="tc-stage-select"
                  style={{ width: '100%', marginTop: 6 }}
                  disabled={!canWrite}
                  value={String(session?.conversation_owner ?? 'ai')}
                  onChange={(e) => patchSession({ owner: e.target.value })}
                >
                  {['ai', 'telecaller', 'agronomist'].map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="flex items-center gap-2 text-xs"
                style={{ marginTop: 14, cursor: canWrite ? 'pointer' : 'default' }}
              >
                <input
                  type="checkbox"
                  disabled={!canWrite}
                  checked={Boolean(session?.ai_paused)}
                  onChange={(e) => patchSession({ aiPaused: e.target.checked })}
                />
                Pause AI replies
              </label>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ActionBtn({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="tc-action-btn" onClick={onClick}>
      {children}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function DataTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: string[][];
  empty: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-slate-100">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">{empty}</p>
      ) : null}
    </div>
  );
}
