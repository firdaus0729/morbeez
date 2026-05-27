import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Rec = {
  id: string;
  recommendation_text: string;
  issue_detected: string | null;
  dosage: string | null;
  source: string;
  status: string;
  created_at: string;
  farmers?: { name: string | null; phone: string };
  farm_blocks?: { name: string; crop_type: string; plot_label: string | null };
};

export function ApprovalsPage({ canApprove }: { canApprove: boolean }) {
  const [rows, setRows] = useState<Rec[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api<{ ok: boolean; recommendations: Rec[] }>(
        '/console/api/v1/os/recommendations/pending'
      );
      setRows(data.recommendations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [lastWhatsApp, setLastWhatsApp] = useState<string | null>(null);

  async function act(id: string, action: 'approve' | 'reject') {
    if (!canApprove) return;
    setLastWhatsApp(null);
    try {
      if (action === 'approve') {
        const d = await api<{
          ok: boolean;
          whatsapp?: { sent: boolean; reason?: string };
        }>(`/console/api/v1/os/recommendations/${id}/approve`, {
          method: 'POST',
          body: JSON.stringify({ sendWhatsApp }),
        });
        if (d.whatsapp?.sent) setLastWhatsApp('WhatsApp sent to farmer.');
        else if (d.whatsapp?.reason === 'no_phone')
          setLastWhatsApp('Approved — farmer has no phone on file; WhatsApp not sent.');
        else if (d.whatsapp?.reason === 'whatsapp_not_configured')
          setLastWhatsApp('Approved — WhatsApp not configured in this environment.');
      } else {
        await api(`/console/api/v1/os/recommendations/${id}/reject`, {
          method: 'POST',
          body: '{}',
        });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  }

  if (!canApprove) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="mt-2 text-sm text-slate-600">Only Super Admin can approve agronomist recommendations.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Recommendation approvals</h1>
      <p className="mt-1 text-sm text-slate-600">
        Agronomist submissions awaiting your approval — approved items trigger WhatsApp follow-up
      </p>

      <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={sendWhatsApp}
          onChange={(e) => setSendWhatsApp(e.target.checked)}
        />
        Send approved recommendation via WhatsApp immediately
      </label>

      {lastWhatsApp ? <p className="mt-2 text-sm text-emerald-700">{lastWhatsApp}</p> : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}

      <div className="mt-6 space-y-3">
        {rows.length === 0 && !loading ? (
          <p className="text-sm text-slate-500">No pending recommendations.</p>
        ) : null}
        {rows.map((r) => (
          <article key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {r.farmers?.name ?? r.farmers?.phone ?? 'Farmer'} ·{' '}
                  {r.farm_blocks?.plot_label ?? r.farm_blocks?.crop_type ?? 'Block'}
                </p>
                <p className="mt-1 text-xs text-slate-500">{r.issue_detected ?? 'General advisory'}</p>
              </div>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                {r.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 capitalize">Source: {r.source?.replace(/_/g, ' ')}</p>
            <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{r.recommendation_text}</p>
            {r.dosage ? (
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-medium">Dosage:</span> {r.dosage}
              </p>
            ) : null}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => act(r.id, 'approve')}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => act(r.id, 'reject')}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Reject
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
