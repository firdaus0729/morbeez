import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Alert, Badge, Btn, EmptyState, Loading, Panel, ReadOnlyBanner } from '../components/ui';

type Rec = {
  id: string;
  recommendation_text: string;
  issue_detected: string | null;
  dosage: string | null;
  source: string;
  status: string;
  farmers?: { name: string | null; phone: string };
  farm_blocks?: { name: string; crop_type: string; plot_label: string | null };
};

export function ApprovalsPage({ canApprove }: { canApprove: boolean }) {
  const [rows, setRows] = useState<Rec[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [lastWhatsApp, setLastWhatsApp] = useState<string | null>(null);

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
          setLastWhatsApp('Approved — farmer has no phone on file.');
        else if (d.whatsapp?.reason === 'whatsapp_not_configured')
          setLastWhatsApp('Approved — WhatsApp not configured.');
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
      <Panel title="Approvals">
        <ReadOnlyBanner />
        <p className="muted">Only Super Admin can approve agronomist recommendations.</p>
      </Panel>
    );
  }

  return (
    <div>
      <p className="muted" style={{ marginBottom: 16 }}>
        Agronomist submissions awaiting approval — approved items can trigger WhatsApp follow-up
      </p>

      <label className="field" style={{ marginBottom: 16 }}>
        <span>
          <input
            type="checkbox"
            checked={sendWhatsApp}
            onChange={(e) => setSendWhatsApp(e.target.checked)}
          />{' '}
          Send approved recommendation via WhatsApp immediately
        </span>
      </label>

      {lastWhatsApp ? <Alert tone="success">{lastWhatsApp}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {loading ? <Loading /> : null}

      {!loading && rows.length === 0 ? <EmptyState>No pending recommendations.</EmptyState> : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((r) => (
          <Panel
            key={r.id}
            title={`${r.farmers?.name ?? r.farmers?.phone ?? 'Farmer'} · ${r.farm_blocks?.plot_label ?? r.farm_blocks?.crop_type ?? 'Block'}`}
            actions={<Badge tone="warn">{r.status}</Badge>}
          >
            <p className="muted">{r.issue_detected ?? 'General advisory'}</p>
            <p style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{r.recommendation_text}</p>
            {r.dosage ? (
              <p className="muted" style={{ marginTop: 8 }}>
                <strong>Dosage:</strong> {r.dosage}
              </p>
            ) : null}
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <Btn variant="primary" onClick={() => act(r.id, 'approve')}>
                Approve
              </Btn>
              <Btn variant="secondary" onClick={() => act(r.id, 'reject')}>
                Reject
              </Btn>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
