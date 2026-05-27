import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { inputClass } from '../Modal';

const base = '/console/api/v1/os/telecaller';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_review', label: 'In review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
];

type EscRow = {
  id: string;
  farmerName: string;
  farmerPhone: string | null;
  cropType: string | null;
  reason: string;
  confidence: number | null;
  priority: string;
  status: string;
  createdLabel: string;
};

type EscDetail = {
  id: string;
  farmer: { name: string; phone: string; district: string } | null;
  reason: string;
  confidence: number | null;
  priority: string;
  status: string;
  createdLabel: string;
  agronomistNotes: string | null;
  resolution: string | null;
  session: {
    cropType?: string;
    cropStage?: string;
    symptomsText?: string;
    voiceTranscript?: string;
    summaryEn?: string;
    probableIssue?: string;
  } | null;
  productRecommendations: Array<{ title: string; handle?: string }>;
};

export function EscalationsPanel({ canWrite }: { canWrite: boolean }) {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [items, setItems] = useState<EscRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EscDetail | null>(null);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [resolution, setResolution] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<{ ok: boolean; items: EscRow[] }>(
        `${base}/escalations?status=${encodeURIComponent(statusFilter)}&limit=50`
      );
      setItems(data.items ?? []);
      if (data.items?.[0] && !selectedId) setSelectedId(data.items[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load escalations');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const data = await api<{ ok: boolean; escalation: EscDetail }>(`${base}/escalations/${id}`);
      const esc = data.escalation;
      setDetail(esc);
      setStatus(esc.status);
      setNotes(esc.agronomistNotes ?? '');
      setResolution(esc.resolution ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load detail');
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  async function saveReview() {
    if (!canWrite || !selectedId) return;
    setSaving(true);
    setError('');
    try {
      await api(`${base}/escalations/${selectedId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          agronomistNotes: notes,
          resolution,
        }),
      });
      await loadList();
      await loadDetail(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function priorityClass(p: string) {
    if (p === 'urgent') return 'bg-red-100 text-red-800';
    if (p === 'high') return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-700';
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Agronomist escalations</h2>
          <p className="text-sm text-slate-600">AI advisory cases needing human review</p>
        </div>
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setSelectedId(null);
          }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:w-2/5">
          {loading ? (
            <p className="p-6 text-sm text-slate-500">Loading…</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Farmer</th>
                  <th className="px-3 py-2">Crop</th>
                  <th className="px-3 py-2">Priority</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setSelectedId(e.id)}
                    className={`cursor-pointer border-t border-slate-100 ${
                      selectedId === e.id ? 'bg-emerald-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-3 py-2">
                      <p className="font-medium">{e.farmerName}</p>
                      <p className="text-xs text-slate-500">{e.farmerPhone}</p>
                    </td>
                    <td className="px-3 py-2 text-xs">{e.cropType ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs capitalize ${priorityClass(e.priority)}`}>
                        {e.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && items.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">No escalations in this filter.</p>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {!detail ? (
            <p className="text-sm text-slate-500">Select an escalation to review.</p>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">{detail.farmer?.name}</h3>
                  <p className="text-slate-600">
                    {detail.farmer?.phone} · {detail.farmer?.district}
                  </p>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs capitalize ${priorityClass(detail.priority)}`}>
                  {detail.priority}
                </span>
              </div>
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Status</dt>
                  <dd className="font-medium capitalize">{detail.status}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Confidence</dt>
                  <dd className="font-medium">
                    {detail.confidence != null ? `${Math.round(Number(detail.confidence) * 100)}%` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Crop</dt>
                  <dd>
                    {detail.session?.cropType ?? '—'}
                    {detail.session?.cropStage ? ` (${detail.session.cropStage})` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Created</dt>
                  <dd>{detail.createdLabel}</dd>
                </div>
              </dl>
              <section>
                <h4 className="font-medium text-slate-900">Reason</h4>
                <p className="mt-1 text-slate-700">{detail.reason}</p>
              </section>
              {detail.session?.symptomsText ? (
                <section>
                  <h4 className="font-medium">Symptoms</h4>
                  <p className="mt-1">{detail.session.symptomsText}</p>
                </section>
              ) : null}
              {detail.session?.probableIssue || detail.session?.summaryEn ? (
                <section>
                  <h4 className="font-medium">AI summary</h4>
                  <p className="mt-1 font-medium">{detail.session.probableIssue}</p>
                  <p className="text-slate-600">{detail.session.summaryEn}</p>
                </section>
              ) : null}
              {detail.productRecommendations.length > 0 ? (
                <section>
                  <h4 className="font-medium">Product recommendations</h4>
                  <ul className="mt-1 list-disc pl-5">
                    {detail.productRecommendations.map((r, i) => (
                      <li key={i}>
                        {r.title}
                        {r.handle ? <span className="text-slate-500"> ({r.handle})</span> : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {canWrite ? (
                <form
                  className="space-y-3 border-t border-slate-100 pt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveReview();
                  }}
                >
                  <label className="block">
                    <span className="text-slate-600">Status</span>
                    <select
                      className={`${inputClass} mt-1`}
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {STATUS_OPTIONS.filter((s) => s.value !== 'all').map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-slate-600">Agronomist notes</span>
                    <textarea
                      className={`${inputClass} mt-1`}
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="text-slate-600">Resolution (for telecaller)</span>
                    <textarea
                      className={`${inputClass} mt-1`}
                      rows={2}
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save review'}
                  </button>
                </form>
              ) : (
                <p className="text-xs text-amber-800">Read-only — need write access to save reviews.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
