import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Alert, HubTabs, PageShell, Panel, Select } from '../components/ui';
import { StatIcon } from '../components/NavIcon';

const base = '/morbeez-staff/api/v1/os/analytics';

type Tab = 'geography' | 'retention' | 'broadcasts' | 'recommendations' | 'ai_accuracy';

type Summary = {
  periodDays: number;
  kpis: {
    farmers: number;
    activeFarmers30d: number;
    retentionRate30d: number;
    broadcastsSent: number;
    broadcastFailureRate: number;
    recommendationsTotal: number;
    recommendationSuccessRate: number;
    topDistrict: string;
    aiDiagnosisCount: number;
    aiEscalationRate: number;
    aiLowConfidenceRate: number;
    aiFollowupImprovementRate: number;
  };
  geography: {
    districts: Array<{
      district: string;
      farmers: number;
      blocks: number;
      recommendations: number;
      broadcastsSent: number;
      intensity: number;
      pincodeCount: number;
    }>;
    pincodeFirstNote?: string;
  };
  retention: {
    totalFarmers: number;
    active7d: number;
    active30d: number;
    rate7d: number;
    rate30d: number;
    inactive90d: number;
    signupCohortByWeek: Array<{ label: string; signups: number }>;
  };
  broadcasts: {
    totals: { sent: number; failed: number; skipped: number; failureRate: number };
    byKind: Array<{ kind: string; sent: number; failed: number; skipped: number; total: number }>;
    dailySent: number[];
    dailyLabels: string[];
  };
  recommendations: {
    totals: {
      created: number;
      communicated: number;
      withOutcome: number;
      successRate: number;
      approvalRate: number;
    };
    byStatus: Array<{ status: string; count: number }>;
    byOutcome: Array<{ outcome: string; count: number }>;
    funnel: Array<{ stage: string; count: number }>;
  };
  aiAccuracy: {
    diagnosisCount: number;
    escalationRate: number;
    lowConfidenceRate: number;
    followupImprovementRate: number;
  };
};

type PincodeRow = {
  pincode: string;
  village: string | null;
  taluk: string;
  farmers: number;
  recommendations: number;
};

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'geography', label: 'District heatmap' },
  { id: 'retention', label: 'Retention' },
  { id: 'broadcasts', label: 'Broadcasts' },
  { id: 'recommendations', label: 'Recommendations' },
  { id: 'ai_accuracy', label: 'AI Accuracy' },
];

type AiTrends = {
  labels: string[];
  dailyDiagnoses: number[];
  dailyEscalations: number[];
  dailyLowConfidence: number[];
  confidenceBands: { high: number; medium: number; low: number };
  outcomeDistribution: Array<{ outcome: string; count: number }>;
};

export function AnalyticsHubPage() {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<Tab>('geography');
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [pincodes, setPincodes] = useState<PincodeRow[]>([]);
  const [pinLoading, setPinLoading] = useState(false);
  const [aiTrends, setAiTrends] = useState<AiTrends | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api<{ ok: boolean } & Summary>(`${base}/summary?days=${days}`);
      setData(d);
      setSelectedDistrict(null);
      setPincodes([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (tab !== 'ai_accuracy') return;
    setAiLoading(true);
    api<{ ok: boolean; trends: AiTrends }>(`${base}/ai-accuracy/trends?days=${days}`)
      .then((d) => setAiTrends(d.trends))
      .catch(() => setAiTrends(null))
      .finally(() => setAiLoading(false));
  }, [tab, days]);

  async function drillDistrict(district: string) {
    setSelectedDistrict(district);
    setPinLoading(true);
    try {
      const d = await api<{ ok: boolean; pincodes: PincodeRow[] }>(
        `${base}/geography/${encodeURIComponent(district)}/pincodes?days=${days}`
      );
      setPincodes(d.pincodes ?? []);
    } catch {
      setPincodes([]);
    } finally {
      setPinLoading(false);
    }
  }

  const k = data?.kpis;

  return (
    <div className="analytics-hub">
      <div className="filter-bar">
        <p className="muted" style={{ flex: 1, margin: 0 }}>
          Pincode-first geography, retention, broadcasts, recommendation outcomes
        </p>
        <label className="field" style={{ margin: 0 }}>
          <span>Period</span>
          <Select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[7, 14, 30, 60, 90].map((d) => (
              <option key={d} value={d}>
                Last {d} days
              </option>
            ))}
          </Select>
        </label>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {k && !loading && data ? (
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <article className="stat-card">
            <div className="stat-card-head">
              <span className="stat-label">Farmers</span>
              <span className="stat-icon stat-icon-teal">
                <StatIcon name="farmers" />
              </span>
            </div>
            <div className="stat-value">{k.farmers}</div>
            <div className="stat-trend trend-up">
              <span className="trend-pct">{k.retentionRate30d}%</span>
              <span className="trend-vs">active 30d</span>
            </div>
          </article>
          <article className="stat-card">
            <div className="stat-card-head">
              <span className="stat-label">Broadcasts</span>
              <span className="stat-icon stat-icon-blue">
                <StatIcon name="cart" />
              </span>
            </div>
            <div className="stat-value">{k.broadcastsSent}</div>
            <div className="stat-trend">
              <span className="trend-pct">{k.broadcastFailureRate}%</span>
              <span className="trend-vs">failed</span>
            </div>
          </article>
          <article className="stat-card">
            <div className="stat-card-head">
              <span className="stat-label">Recommendations</span>
              <span className="stat-icon stat-icon-purple">
                <StatIcon name="ai" />
              </span>
            </div>
            <div className="stat-value">{k.recommendationsTotal}</div>
            <div className="stat-trend trend-up">
              <span className="trend-pct">{k.recommendationSuccessRate}%</span>
              <span className="trend-vs">positive</span>
            </div>
          </article>
          <article className="stat-card">
            <div className="stat-card-head">
              <span className="stat-label">Top district</span>
            </div>
            <div className="stat-value" style={{ fontSize: '1.1rem' }}>
              {k.topDistrict}
            </div>
          </article>
          <article className="stat-card">
            <div className="stat-card-head">
              <span className="stat-label">AI diagnosis</span>
              <span className="stat-icon stat-icon-purple">
                <StatIcon name="ai" />
              </span>
            </div>
            <div className="stat-value">{k.aiDiagnosisCount}</div>
            <div className="stat-trend trend-up">
              <span className="trend-pct">{k.aiFollowupImprovementRate}%</span>
              <span className="trend-vs">follow-up improved</span>
            </div>
            <div className="stat-trend">
              <span className="trend-pct">{k.aiEscalationRate}% escalated</span>
              <span className="trend-vs">{k.aiLowConfidenceRate}% low confidence</span>
            </div>
          </article>
        </div>
      ) : null}

      <HubTabs tabs={TABS} active={tab} onChange={setTab} />

      <PageShell loading={loading} error={!data && !loading ? error || 'No data' : null} loadingLabel="Loading analytics…">
        {!data ? null : (
        <div className="mt-6">
          {tab === 'geography' ? (
            <div className="space-y-6">
              {data.geography.pincodeFirstNote ? (
                <p className="text-xs text-slate-500">{data.geography.pincodeFirstNote}</p>
              ) : null}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">District</th>
                      <th className="px-4 py-3">Intensity</th>
                      <th className="px-4 py-3">Farmers</th>
                      <th className="px-4 py-3">Blocks</th>
                      <th className="px-4 py-3">Recs</th>
                      <th className="px-4 py-3">Broadcasts</th>
                      <th className="px-4 py-3">Pincodes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.geography.districts.map((d) => (
                      <tr key={d.district} className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="font-medium text-emerald-700 hover:underline"
                            onClick={() => drillDistrict(d.district)}
                          >
                            {d.district}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <HeatBar intensity={d.intensity} />
                        </td>
                        <td className="px-4 py-3">{d.farmers}</td>
                        <td className="px-4 py-3">{d.blocks}</td>
                        <td className="px-4 py-3">{d.recommendations}</td>
                        <td className="px-4 py-3">{d.broadcastsSent}</td>
                        <td className="px-4 py-3">{d.pincodeCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.geography.districts.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">
                    No geography data — assign pincodes to farmers in Intelligence hub.
                  </p>
                ) : null}
              </div>

              {selectedDistrict ? (
                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="font-medium text-slate-900">
                    Pincode breakdown — {selectedDistrict}
                  </h2>
                  {pinLoading ? (
                    <div className="mt-4 py-6">
                      <PageShell loading loadingLabel="Loading pincodes…" />
                    </div>
                  ) : (
                    <table className="mt-3 w-full text-left text-sm">
                      <thead className="text-xs uppercase text-slate-500">
                        <tr>
                          <th className="py-2">Pincode</th>
                          <th className="py-2">Village</th>
                          <th className="py-2">Taluk</th>
                          <th className="py-2">Farmers</th>
                          <th className="py-2">Recs ({days}d)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pincodes.map((p) => (
                          <tr key={p.pincode} className="border-t border-slate-50">
                            <td className="py-2 font-mono text-xs">{p.pincode}</td>
                            <td className="py-2">{p.village ?? '—'}</td>
                            <td className="py-2">{p.taluk}</td>
                            <td className="py-2">{p.farmers}</td>
                            <td className="py-2">{p.recommendations}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>
              ) : null}
            </div>
          ) : null}

          {tab === 'retention' ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-medium text-slate-900">Active farmers</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <Row label="Total farmers" value={data.retention.totalFarmers} />
                  <Row label="Active (7 days)" value={`${data.retention.active7d} (${data.retention.rate7d}%)`} />
                  <Row label="Active (30 days)" value={`${data.retention.active30d} (${data.retention.rate30d}%)`} />
                  <Row label="Inactive 90+ days" value={data.retention.inactive90d} />
                </dl>
                <p className="mt-4 text-xs text-slate-500">
                  Active = login or CRM interaction in the window.
                </p>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-medium text-slate-900">New signups by week</h2>
                <div className="mt-4 space-y-2">
                  {data.retention.signupCohortByWeek.map((w) => (
                    <div key={w.label} className="flex items-center gap-3 text-sm">
                      <span className="w-16 shrink-0 text-slate-500">{w.label}</span>
                      <div className="flex-1 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{
                            width: `${Math.min(100, (w.signups / Math.max(1, ...data.retention.signupCohortByWeek.map((x) => x.signups))) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-8 text-right font-medium">{w.signups}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {tab === 'broadcasts' ? (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <KpiCard label="Sent" value={String(data.broadcasts.totals.sent)} />
                <KpiCard label="Failed" value={String(data.broadcasts.totals.failed)} />
                <KpiCard label="Skipped" value={String(data.broadcasts.totals.skipped)} />
              </div>
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="font-medium text-slate-900">Daily sends (last 14 days)</h2>
                <MiniBarChart labels={data.broadcasts.dailyLabels} values={data.broadcasts.dailySent} />
              </section>
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-medium">By broadcast kind</h2>
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Kind</th>
                      <th className="px-4 py-3">Sent</th>
                      <th className="px-4 py-3">Failed</th>
                      <th className="px-4 py-3">Skipped</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.broadcasts.byKind.map((b) => (
                      <tr key={b.kind} className="border-t border-slate-100">
                        <td className="px-4 py-3">{b.kind.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3">{b.sent}</td>
                        <td className="px-4 py-3">{b.failed}</td>
                        <td className="px-4 py-3">{b.skipped}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          ) : null}

          {tab === 'recommendations' ? (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="Created" value={String(data.recommendations.totals.created)} />
                <KpiCard label="Approval rate" value={`${data.recommendations.totals.approvalRate}%`} />
                <KpiCard label="Communicated" value={String(data.recommendations.totals.communicated)} />
                <KpiCard label="Success rate" value={`${data.recommendations.totals.successRate}%`} />
              </div>
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="font-medium text-slate-900">Workflow funnel</h2>
                <div className="mt-4 space-y-2">
                  {data.recommendations.funnel.map((f) => (
                    <div key={f.stage} className="flex items-center gap-3 text-sm">
                      <span className="w-36 shrink-0 text-slate-600">{f.stage}</span>
                      <div className="flex-1 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-violet-500"
                          style={{
                            width: `${Math.min(100, (f.count / Math.max(1, data.recommendations.totals.created)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-10 text-right font-medium">{f.count}</span>
                    </div>
                  ))}
                </div>
              </section>
              <div className="grid gap-6 lg:grid-cols-2">
                <StatusTable title="By status" rows={data.recommendations.byStatus} />
                <StatusTable title="By outcome" rows={data.recommendations.byOutcome.map((o) => ({ status: o.outcome, count: o.count }))} />
              </div>
            </div>
          ) : null}

          {tab === 'ai_accuracy' ? (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="Diagnoses" value={String(data.aiAccuracy.diagnosisCount)} />
                <KpiCard
                  label="Escalation rate"
                  value={`${Math.round(data.aiAccuracy.escalationRate * 1000) / 10}%`}
                  tone={rateTone(data.aiAccuracy.escalationRate, { goodMax: 0.2, warnMax: 0.35 })}
                />
                <KpiCard
                  label="Low confidence rate"
                  value={`${Math.round(data.aiAccuracy.lowConfidenceRate * 1000) / 10}%`}
                  tone={rateTone(data.aiAccuracy.lowConfidenceRate, { goodMax: 0.15, warnMax: 0.3 })}
                />
                <KpiCard
                  label="Follow-up improved"
                  value={`${Math.round(data.aiAccuracy.followupImprovementRate * 1000) / 10}%`}
                  tone={inverseRateTone(data.aiAccuracy.followupImprovementRate, {
                    goodMin: 0.6,
                    warnMin: 0.4,
                  })}
                />
              </div>
              {aiLoading ? (
                <Panel title="AI accuracy trends">
                  <p className="text-sm text-slate-500">Loading AI trend charts…</p>
                </Panel>
              ) : aiTrends ? (
                <>
                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="font-medium text-slate-900">Daily diagnoses</h2>
                    <MiniBarChart labels={aiTrends.labels} values={aiTrends.dailyDiagnoses} />
                  </section>
                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="font-medium text-slate-900">Daily escalations</h2>
                    <MiniBarChart labels={aiTrends.labels} values={aiTrends.dailyEscalations} />
                  </section>
                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="font-medium text-slate-900">Daily low-confidence cases</h2>
                    <MiniBarChart labels={aiTrends.labels} values={aiTrends.dailyLowConfidence} />
                  </section>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <StatusTable
                      title="Confidence bands"
                      rows={[
                        { status: 'high (>90%)', count: aiTrends.confidenceBands.high },
                        { status: 'medium (70-90%)', count: aiTrends.confidenceBands.medium },
                        { status: 'low (<70%)', count: aiTrends.confidenceBands.low },
                      ]}
                    />
                    <StatusTable
                      title="Outcome distribution"
                      rows={aiTrends.outcomeDistribution.map((o) => ({
                        status: o.outcome,
                        count: o.count,
                      }))}
                    />
                  </div>
                </>
              ) : (
                <Panel title="AI accuracy trends">
                  <p className="text-sm text-slate-500">No AI trend data for this period.</p>
                </Panel>
              )}
            </div>
          ) : null}
        </div>
        )}
      </PageShell>
    </div>
  );
}

function rateTone(
  value: number,
  limits: { goodMax: number; warnMax: number }
): 'good' | 'warn' | 'risk' {
  if (value <= limits.goodMax) return 'good';
  if (value <= limits.warnMax) return 'warn';
  return 'risk';
}

function inverseRateTone(
  value: number,
  limits: { goodMin: number; warnMin: number }
): 'good' | 'warn' | 'risk' {
  if (value >= limits.goodMin) return 'good';
  if (value >= limits.warnMin) return 'warn';
  return 'risk';
}

function toneClass(tone?: 'good' | 'warn' | 'risk'): string {
  if (tone === 'good') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (tone === 'warn') return 'text-amber-700 bg-amber-50 border-amber-200';
  if (tone === 'risk') return 'text-rose-700 bg-rose-50 border-rose-200';
  return 'text-slate-900 bg-white border-slate-200';
}

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'good' | 'warn' | 'risk';
}) {
  return (
    <article className={`rounded-xl border p-4 shadow-sm ${toneClass(tone)}`}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </article>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function HeatBar({ intensity }: { intensity: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${Math.min(100, intensity)}%` }}
        />
      </div>
      <span className="text-xs text-slate-500">{intensity}</span>
    </div>
  );
}

function MiniBarChart({ labels, values }: { labels: string[]; values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="mt-4 flex items-end gap-1 overflow-x-auto pb-2" style={{ minHeight: 120 }}>
      {values.map((v, i) => (
        <div key={labels[i] ?? i} className="flex min-w-[2rem] flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-emerald-400"
            style={{ height: `${Math.max(4, (v / max) * 96)}px` }}
            title={String(v)}
          />
          <span className="text-[10px] text-slate-500">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function StatusTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ status: string; count: number }>;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-medium">{title}</h2>
      <table className="w-full text-left text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.status} className="border-t border-slate-100">
              <td className="px-4 py-2 capitalize">{r.status.replace(/_/g, ' ')}</td>
              <td className="px-4 py-2 text-right font-medium">{r.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">No data in this period.</p>
      ) : null}
    </section>
  );
}
