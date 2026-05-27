import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { api } from '../../lib/api';
import { CrmModals, type CrmModalType } from './CrmModals';
import { LeadExportMenu } from './LeadExportMenu';
import { openWhatsAppShare } from '../../lib/crmExport';

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
  | 'blocks'
  | 'interactions'
  | 'recommendations'
  | 'findings'
  | 'orders'
  | 'whatsapp';

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
  { id: 'blocks', label: 'Blocks' },
  { id: 'interactions', label: 'Interactions' },
  { id: 'recommendations', label: 'Recommendations' },
  { id: 'findings', label: 'Field findings' },
  { id: 'orders', label: 'Orders' },
  { id: 'whatsapp', label: 'WhatsApp' },
];

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
      } else if (tab === 'recommendations') {
        const rec = await api<{ ok: boolean; recommendations: Array<Record<string, unknown>> }>(
          `${base}/leads/${leadId}/recommendations`
        );
        setRecommendations(rec.recommendations ?? []);
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
    return <p className="text-sm text-slate-500">Loading farmer…</p>;
  }

  if (!detail) {
    return <p className="text-sm text-red-600">{error || 'Lead not found'}</p>;
  }

  const l = detail.lead;
  const f = detail.farmer;

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-slate-200 pb-4">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
            {l.farmerInitials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{l.farmerName}</h2>
            <LeadExportMenu leadId={leadId} canShare={Boolean(l.phone)} />
            </div>
            <p className="text-sm text-slate-600">
              {l.phone} · {f.territory} · ★ {Number(l.leadScore).toFixed(1)}
            </p>
            {canWrite ? (
              <select
                className="mt-2 rounded border border-slate-200 px-2 py-1 text-sm"
                value={l.stage}
                onChange={(e) => changeStage(e.target.value)}
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                {l.stageLabel}
              </span>
            )}
          </div>
        </div>
        <nav className="mt-4 flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs ${
                tab === t.id
                  ? 'bg-emerald-50 font-medium text-emerald-800'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        {canWrite ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionBtn onClick={() => setModal('call')}>Log call</ActionBtn>
            <ActionBtn onClick={() => setModal('task')}>Follow-up</ActionBtn>
            <ActionBtn onClick={() => setModal('visit')}>Schedule visit</ActionBtn>
            <ActionBtn onClick={() => setModal('order')}>New order</ActionBtn>
          </div>
        ) : null}
      </header>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {modal ? (
        <CrmModals
          type={modal}
          leadId={leadId}
          blocks={blocks}
          onClose={() => setModal(null)}
          onSaved={bumpData}
        />
      ) : null}

      <div className="flex-1 overflow-auto py-4">
        {tab === 'overview' ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <h3 className="font-medium text-slate-900">Farm profile</h3>
              <dl className="mt-3 space-y-2">
                <Row label="Primary crop" value={f.crop} />
                <Row label="Blocks" value={String(detail.farmOverview.totalBlocks)} />
                <Row label="Acreage" value={f.acreage} />
                <Row label="Irrigation" value={f.irrigation} />
                <Row label="Soil" value={f.soilType} />
                <Row label="Language" value={f.language} />
              </dl>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <h3 className="font-medium text-slate-900">Next follow-up</h3>
              {detail.nextFollowUp ? (
                <p className="mt-2 text-slate-700">
                  <strong>{detail.nextFollowUp.title}</strong>
                  <br />
                  <span className="text-slate-500">{detail.nextFollowUp.dueLabel}</span>
                </p>
              ) : (
                <p className="mt-2 text-slate-500">None scheduled</p>
              )}
              {canWrite ? (
                <form onSubmit={addNote} className="mt-4 border-t border-slate-100 pt-4">
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
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm lg:col-span-2">
              <h3 className="font-medium text-slate-900">Timeline</h3>
              <ul className="mt-3 space-y-2">
                {detail.timeline.map((ev) => (
                  <li key={ev.id} className="border-l-2 border-emerald-200 pl-3">
                    <p className="font-medium text-slate-800">{ev.title}</p>
                    <p className="text-xs text-slate-500">{ev.atLabel}</p>
                    {ev.detail ? <p className="text-xs text-slate-600">{ev.detail}</p> : null}
                  </li>
                ))}
                {detail.timeline.length === 0 ? (
                  <li className="text-slate-500">No activity yet</li>
                ) : null}
              </ul>
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
          <DataTable
            headers={['Type', 'Summary', 'Status', 'When']}
            rows={interactions.map((r) => [
              String(r.interactionType ?? r.type ?? '—'),
              String(r.summary ?? r.notes ?? '—').slice(0, 80),
              String(r.status ?? '—'),
              String(r.createdLabel ?? r.created_at ?? '—'),
            ])}
            empty="No cultivation interactions logged."
          />
          </>
        ) : null}

        {tab === 'recommendations' ? (
          <>
            {canWrite ? (
              <div className="mb-3">
                <ActionBtn onClick={() => setModal('recommendation')}>+ Add recommendation</ActionBtn>
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
          <DataTable
            headers={['Visit', 'Observations', 'Severity']}
            rows={findings.map((r) => [
              String(r.visitedLabel ?? r.visited_at ?? '—'),
              String(r.observations ?? '—').slice(0, 100),
              String(r.severity ?? '—'),
            ])}
            empty="No field findings."
          />
          </>
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
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="max-h-80 flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((m) => (
                  <div
                    key={String(m.id)}
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      m.direction === 'outbound'
                        ? 'ml-auto bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    {String(m.content ?? '')}
                    <p className="mt-1 text-[10px] opacity-70">
                      {m.created_at ? new Date(String(m.created_at)).toLocaleString('en-IN') : ''}
                    </p>
                  </div>
                ))}
                {messages.length === 0 ? (
                  <p className="text-sm text-slate-500">No WhatsApp messages in log.</p>
                ) : null}
              </div>
              {canWrite ? (
                <form onSubmit={sendWhatsApp} className="border-t border-slate-100 p-3 flex gap-2">
                  <input
                    className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm"
                    value={waText}
                    onChange={(e) => setWaText(e.target.value)}
                    placeholder="Type a message…"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
                  >
                    Send
                  </button>
                </form>
              ) : null}
            </div>
            <aside className="w-full lg:w-56 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <h3 className="font-medium">Session</h3>
              <label className="mt-3 block text-xs text-slate-600">
                Owner
                <select
                  className="mt-1 w-full rounded border border-slate-200 px-2 py-1"
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
              <label className="mt-3 flex items-center gap-2 text-xs">
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
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
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
