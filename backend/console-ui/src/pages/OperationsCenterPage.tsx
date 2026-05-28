import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { api } from '../lib/api';
import {
  AutomationJobsPanel,
  LanguageTemplatesPanel,
  QuickRepliesPanel,
} from '../components/operations/OperationsMessagingExtras';
import { Alert, HubTabs, Loading, ReadOnlyBanner } from '../components/ui';

type Tab =
  | 'messaging'
  | 'broadcasts'
  | 'prices'
  | 'terminology'
  | 'weather'
  | 'quickReplies'
  | 'langTemplates'
  | 'automationJobs';

type MessagingConfig = {
  provider: string;
  broadcastsEnabled: boolean;
  broadcastMaxPerDay: number;
  broadcastKindCooldownHours: number;
  sessionHours: number;
  cultivationFollowUpsEnabled: boolean;
  advisoryFollowUpsEnabled: boolean;
  advisoryAutomationEnabled: boolean;
  orderAlertsEnabled: boolean;
};

type BroadcastRule = {
  id: string;
  crop_type: string;
  broadcast_kind: string;
  target_dap: number | null;
  min_dap: number | null;
  max_dap: number | null;
  weekday: number | null;
  priority: number;
  active: boolean;
};

type Delivery = {
  id: string;
  broadcast_kind: string;
  status: string;
  created_at: string;
  farmers?: { phone: string; name: string | null; district: string | null };
};

type CropPrice = {
  id: string;
  crop_type: string;
  market_name: string;
  district: string | null;
  price_per_kg: number;
  price_date: string;
};

type TermTask = {
  id: string;
  term: string;
  language: string | null;
  crop_type: string | null;
  district: string | null;
  context_text: string | null;
  status: string;
  created_at: string;
  farmers?: { phone: string; name: string | null; district: string | null };
};

type WeatherRule = {
  id: string;
  rule_key: string;
  version: number;
  crop_type: string | null;
  action_type: string;
  status: string;
  effective_from: string | null;
};

const BROADCAST_KINDS = [
  'cultivation_schedule',
  'fertigation_reminder',
  'pgr_broadcast',
  'dap_task',
  'cultivation_knowledge',
] as const;

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'messaging', label: 'Messaging' },
  { id: 'broadcasts', label: 'Broadcasts' },
  { id: 'prices', label: 'Daily prices' },
  { id: 'terminology', label: 'Terminology' },
  { id: 'weather', label: 'Weather rules' },
  { id: 'quickReplies', label: 'Quick replies' },
  { id: 'langTemplates', label: 'Language templates' },
  { id: 'automationJobs', label: 'Automation jobs' },
];

export function OperationsCenterPage({ canWrite }: { canWrite: boolean }) {
  const [tab, setTab] = useState<Tab>('broadcasts');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [config, setConfig] = useState<MessagingConfig | null>(null);
  const [rules, setRules] = useState<BroadcastRule[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [prices, setPrices] = useState<CropPrice[]>([]);
  const [tasks, setTasks] = useState<TermTask[]>([]);
  const [termStatus, setTermStatus] = useState('open');
  const [weatherRules, setWeatherRules] = useState<WeatherRule[]>([]);

  const [quickReplies, setQuickReplies] = useState<
    Array<{
      id: string;
      shortcut_key: string;
      category: string;
      label_en: string;
      body_en: string;
      body_ml: string | null;
      active: boolean;
      sort_order: number;
    }>
  >([]);
  const [qrCategory, setQrCategory] = useState('all');
  const [langTemplates, setLangTemplates] = useState<
    Array<{
      id: string;
      template_key: string;
      language: string;
      channel: string;
      body_text: string;
      meta_template_name: string | null;
      status: string;
      active: boolean;
    }>
  >([]);
  const [tplStatus, setTplStatus] = useState('all');
  const [autoJobs, setAutoJobs] = useState<
    Array<{
      id: string;
      job_type: string;
      status: string;
      scheduled_at: string;
      attempts: number;
      last_error: string | null;
      farmerName: string;
      farmerPhone: string | null;
      payload: Record<string, unknown>;
    }>
  >([]);
  const [autoStats, setAutoStats] = useState<Record<string, number> | null>(null);
  const [jobStatus, setJobStatus] = useState('active');
  const [jobType, setJobType] = useState('all');

  const [runDryRun, setRunDryRun] = useState(true);
  const [runResult, setRunResult] = useState<string>('');

  const [ruleForm, setRuleForm] = useState({
    cropType: 'ginger',
    broadcastKind: 'cultivation_schedule' as (typeof BROADCAST_KINDS)[number],
    targetDap: '',
    priority: '50',
    active: true,
  });

  const [priceForm, setPriceForm] = useState({
    cropType: 'ginger',
    marketName: '',
    district: '',
    pricePerKg: '',
  });

  const base = '/console/api/v1/os/operations';

  const loadTab = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'messaging') {
        const d = await api<{ ok: boolean; config: MessagingConfig }>(`${base}/messaging-config`);
        setConfig(d.config);
      } else if (tab === 'broadcasts') {
        const [r, del] = await Promise.all([
          api<{ ok: boolean; rules: BroadcastRule[] }>(`${base}/broadcasts/rules`),
          api<{ ok: boolean; deliveries: Delivery[] }>(`${base}/broadcasts/deliveries?limit=40`),
        ]);
        setRules(r.rules ?? []);
        setDeliveries(del.deliveries ?? []);
      } else if (tab === 'prices') {
        const d = await api<{ ok: boolean; prices: CropPrice[] }>(`${base}/crop-prices`);
        setPrices(d.prices ?? []);
      } else if (tab === 'terminology') {
        const d = await api<{ ok: boolean; tasks: TermTask[] }>(
          `${base}/terminology/tasks?status=${encodeURIComponent(termStatus)}`
        );
        setTasks(d.tasks ?? []);
      } else if (tab === 'weather') {
        const d = await api<{ ok: boolean; rules: WeatherRule[] }>(`${base}/weather-rules`);
        setWeatherRules(d.rules ?? []);
      } else if (tab === 'quickReplies') {
        const q =
          qrCategory !== 'all' ? `?category=${encodeURIComponent(qrCategory)}` : '';
        const d = await api<{ ok: boolean; replies: typeof quickReplies }>(
          `${base}/quick-replies${q}`
        );
        setQuickReplies(d.replies ?? []);
      } else if (tab === 'langTemplates') {
        const q =
          tplStatus !== 'all' ? `?status=${encodeURIComponent(tplStatus)}` : '';
        const d = await api<{ ok: boolean; templates: typeof langTemplates }>(
          `${base}/language-templates${q}`
        );
        setLangTemplates(d.templates ?? []);
      } else if (tab === 'automationJobs') {
        const params = new URLSearchParams();
        params.set('status', jobStatus);
        if (jobType !== 'all') params.set('jobType', jobType);
        const [jobsRes, statsRes] = await Promise.all([
          api<{ ok: boolean; jobs: typeof autoJobs }>(`${base}/automation-jobs?${params}`),
          api<{ ok: boolean; stats: Record<string, number> }>(`${base}/automation-jobs/stats`),
        ]);
        setAutoJobs(jobsRes.jobs ?? []);
        setAutoStats(statsRes.stats ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tab, termStatus, qrCategory, tplStatus, jobStatus, jobType]);

  useEffect(() => {
    loadTab();
  }, [loadTab]);

  async function saveRule(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setError('');
    try {
      await api(`${base}/broadcasts/rules`, {
        method: 'POST',
        body: JSON.stringify({
          cropType: ruleForm.cropType,
          broadcastKind: ruleForm.broadcastKind,
          targetDap: ruleForm.targetDap ? Number(ruleForm.targetDap) : null,
          priority: Number(ruleForm.priority) || 50,
          active: ruleForm.active,
        }),
      });
      await loadTab();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save rule');
    }
  }

  async function runBroadcasts() {
    if (!canWrite) return;
    setRunResult('');
    setError('');
    try {
      const d = await api<{ ok: boolean; result: unknown }>(`${base}/broadcasts/run`, {
        method: 'POST',
        body: JSON.stringify({ dryRun: runDryRun }),
      });
      setRunResult(JSON.stringify(d.result, null, 2));
      await loadTab();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Run failed');
    }
  }

  async function savePrice(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setError('');
    try {
      await api(`${base}/crop-prices`, {
        method: 'POST',
        body: JSON.stringify({
          cropType: priceForm.cropType,
          marketName: priceForm.marketName,
          district: priceForm.district || undefined,
          pricePerKg: Number(priceForm.pricePerKg),
        }),
      });
      setPriceForm((f) => ({ ...f, marketName: '', pricePerKg: '' }));
      await loadTab();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save price');
    }
  }

  async function resolveTerm(id: string, status: 'resolved' | 'dismissed') {
    if (!canWrite) return;
    try {
      await api(`${base}/terminology/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadTab();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function archiveBroadcastRule(id: string) {
    if (!canWrite || !confirm('Archive this broadcast rule?')) return;
    try {
      await api(`${base}/broadcasts/rules/${id}`, { method: 'DELETE' });
      await loadTab();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not archive rule');
    }
  }

  async function archiveCropPrice(id: string) {
    if (!canWrite || !confirm('Archive this crop price?')) return;
    try {
      await api(`${base}/crop-prices/${id}`, { method: 'DELETE' });
      await loadTab();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not archive price');
    }
  }

  return (
    <div className="operations-hub">
      <p className="muted" style={{ marginBottom: 12 }}>
        WhatsApp broadcasts, quick replies, templates, automation, mandi prices, terminology
      </p>
      {!canWrite ? <ReadOnlyBanner /> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      <HubTabs tabs={TABS} active={tab} onChange={setTab} />
      {loading ? (
        <Loading />
      ) : (
        <div className="mt-6">
          {tab === 'messaging' && config ? (
            <div className="grid max-w-2xl gap-3 rounded-xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
              <Row label="Provider" value={config.provider} />
              <Row label="Broadcasts enabled" value={config.broadcastsEnabled ? 'Yes' : 'No'} />
              <Row label="Max broadcasts / day" value={String(config.broadcastMaxPerDay)} />
              <Row label="Kind cooldown (hours)" value={String(config.broadcastKindCooldownHours)} />
              <Row label="Session window (hours)" value={String(config.sessionHours)} />
              <Row label="Cultivation follow-ups" value={config.cultivationFollowUpsEnabled ? 'Yes' : 'No'} />
              <Row label="Advisory follow-ups" value={config.advisoryFollowUpsEnabled ? 'Yes' : 'No'} />
              <Row label="Advisory automation" value={config.advisoryAutomationEnabled ? 'Yes' : 'No'} />
              <Row label="Order alerts" value={config.orderAlertsEnabled ? 'Yes' : 'No'} />
              <p className="mt-2 text-xs text-slate-500">
                Values come from server environment. Change in deployment config, then restart API.
              </p>
            </div>
          ) : null}

          {tab === 'broadcasts' ? (
            <div className="space-y-8">
              {canWrite ? (
                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="font-medium text-slate-900">Run broadcasts now</h2>
                  <p className="mt-1 text-xs text-slate-500">Manual trigger bypasses IST morning window</p>
                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={runDryRun}
                      onChange={(e) => setRunDryRun(e.target.checked)}
                    />
                    Dry run (no messages sent)
                  </label>
                  <button
                    type="button"
                    onClick={runBroadcasts}
                    className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Run
                  </button>
                  {runResult ? (
                    <pre className="mt-3 max-h-48 overflow-auto rounded bg-slate-50 p-3 text-xs">
                      {runResult}
                    </pre>
                  ) : null}
                </section>
              ) : null}

              {canWrite ? (
                <form onSubmit={saveRule} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="font-medium text-slate-900">Add broadcast rule</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="text-sm">
                      <span className="text-slate-600">Crop</span>
                      <input
                        className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
                        value={ruleForm.cropType}
                        onChange={(e) => setRuleForm((f) => ({ ...f, cropType: e.target.value }))}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="text-slate-600">Kind</span>
                      <select
                        className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
                        value={ruleForm.broadcastKind}
                        onChange={(e) =>
                          setRuleForm((f) => ({
                            ...f,
                            broadcastKind: e.target.value as (typeof BROADCAST_KINDS)[number],
                          }))
                        }
                      >
                        {BROADCAST_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="text-slate-600">Target DAP</span>
                      <input
                        type="number"
                        className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
                        value={ruleForm.targetDap}
                        onChange={(e) => setRuleForm((f) => ({ ...f, targetDap: e.target.value }))}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="text-slate-600">Priority</span>
                      <input
                        type="number"
                        className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
                        value={ruleForm.priority}
                        onChange={(e) => setRuleForm((f) => ({ ...f, priority: e.target.value }))}
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
                  >
                    Save rule
                  </button>
                </form>
              ) : null}

              <TableSection title="Broadcast rules">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Crop</th>
                      <th className="px-4 py-3">Kind</th>
                      <th className="px-4 py-3">DAP</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Active</th>
                      {canWrite ? <th className="px-4 py-3" /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">{r.crop_type}</td>
                        <td className="px-4 py-3">{r.broadcast_kind}</td>
                        <td className="px-4 py-3">{r.target_dap ?? `${r.min_dap ?? '—'}–${r.max_dap ?? '—'}`}</td>
                        <td className="px-4 py-3">{r.priority}</td>
                        <td className="px-4 py-3">{r.active ? 'Yes' : 'No'}</td>
                        {canWrite ? (
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="text-xs text-red-600 hover:underline"
                              onClick={() => archiveBroadcastRule(r.id)}
                            >
                              Archive
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rules.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">No rules yet.</p>
                ) : null}
              </TableSection>

              <TableSection title="Recent deliveries">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">When</th>
                      <th className="px-4 py-3">Farmer</th>
                      <th className="px-4 py-3">Kind</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((d) => (
                      <tr key={d.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {new Date(d.created_at).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          {d.farmers?.name ?? '—'}
                          <span className="block text-xs text-slate-500">{d.farmers?.phone}</span>
                        </td>
                        <td className="px-4 py-3">{d.broadcast_kind}</td>
                        <td className="px-4 py-3 capitalize">{d.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableSection>
            </div>
          ) : null}

          {tab === 'prices' ? (
            <div className="space-y-6">
              {canWrite ? (
                <form onSubmit={savePrice} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="font-medium text-slate-900">Add today&apos;s price</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="text-sm">
                      <span className="text-slate-600">Crop</span>
                      <input
                        className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
                        value={priceForm.cropType}
                        onChange={(e) => setPriceForm((f) => ({ ...f, cropType: e.target.value }))}
                        required
                      />
                    </label>
                    <label className="text-sm">
                      <span className="text-slate-600">Market</span>
                      <input
                        className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
                        value={priceForm.marketName}
                        onChange={(e) => setPriceForm((f) => ({ ...f, marketName: e.target.value }))}
                        required
                      />
                    </label>
                    <label className="text-sm">
                      <span className="text-slate-600">District</span>
                      <input
                        className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
                        value={priceForm.district}
                        onChange={(e) => setPriceForm((f) => ({ ...f, district: e.target.value }))}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="text-slate-600">₹ / kg</span>
                      <input
                        type="number"
                        step="0.01"
                        className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
                        value={priceForm.pricePerKg}
                        onChange={(e) => setPriceForm((f) => ({ ...f, pricePerKg: e.target.value }))}
                        required
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Save price
                  </button>
                </form>
              ) : null}

              <TableSection title="Today&apos;s prices">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Crop</th>
                      <th className="px-4 py-3">Market</th>
                      <th className="px-4 py-3">District</th>
                      <th className="px-4 py-3">₹/kg</th>
                      {canWrite ? <th className="px-4 py-3" /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((p) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">{p.crop_type}</td>
                        <td className="px-4 py-3">{p.market_name}</td>
                        <td className="px-4 py-3">{p.district ?? '—'}</td>
                        <td className="px-4 py-3">{p.price_per_kg}</td>
                        {canWrite ? (
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="text-xs text-red-600 hover:underline"
                              onClick={() => archiveCropPrice(p.id)}
                            >
                              Archive
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {prices.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">No prices for today.</p>
                ) : null}
              </TableSection>
            </div>
          ) : null}

          {tab === 'terminology' ? (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <label className="text-sm text-slate-600">Status</label>
                <select
                  className="rounded border border-slate-200 px-2 py-1 text-sm"
                  value={termStatus}
                  onChange={(e) => setTermStatus(e.target.value)}
                >
                  {['open', 'in_review', 'resolved', 'dismissed', 'all'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <TableSection title="Unknown terms queue">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Term</th>
                      <th className="px-4 py-3">Farmer</th>
                      <th className="px-4 py-3">Context</th>
                      <th className="px-4 py-3">Status</th>
                      {canWrite ? <th className="px-4 py-3" /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => (
                      <tr key={t.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium">
                          {t.term}
                          <span className="block text-xs font-normal text-slate-500">
                            {[t.language, t.crop_type, t.district].filter(Boolean).join(' · ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {t.farmers?.name ?? '—'}
                          <br />
                          {t.farmers?.phone}
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-xs text-slate-600">
                          {t.context_text ?? '—'}
                        </td>
                        <td className="px-4 py-3 capitalize">{t.status}</td>
                        {canWrite ? (
                          <td className="px-4 py-3">
                            {t.status === 'open' || t.status === 'in_review' ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className="text-xs text-emerald-700 hover:underline"
                                  onClick={() => resolveTerm(t.id, 'resolved')}
                                >
                                  Resolve
                                </button>
                                <button
                                  type="button"
                                  className="text-xs text-slate-500 hover:underline"
                                  onClick={() => resolveTerm(t.id, 'dismissed')}
                                >
                                  Dismiss
                                </button>
                              </div>
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tasks.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">No tasks in this filter.</p>
                ) : null}
              </TableSection>
            </div>
          ) : null}

          {tab === 'quickReplies' ? (
            <QuickRepliesPanel
              replies={quickReplies}
              canWrite={canWrite}
              category={qrCategory}
              onCategoryChange={setQrCategory}
              onRefresh={loadTab}
            />
          ) : null}

          {tab === 'langTemplates' ? (
            <LanguageTemplatesPanel
              templates={langTemplates}
              canWrite={canWrite}
              statusFilter={tplStatus}
              onStatusChange={setTplStatus}
              onRefresh={loadTab}
            />
          ) : null}

          {tab === 'automationJobs' ? (
            <AutomationJobsPanel
              jobs={autoJobs}
              stats={autoStats}
              canWrite={canWrite}
              statusFilter={jobStatus}
              jobTypeFilter={jobType}
              onStatusChange={setJobStatus}
              onJobTypeChange={setJobType}
              onRefresh={loadTab}
            />
          ) : null}

          {tab === 'weather' ? (
            <TableSection title="Weather rule definitions (read-only)">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Rule</th>
                    <th className="px-4 py-3">Crop</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {weatherRules.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        {r.rule_key} v{r.version}
                      </td>
                      <td className="px-4 py-3">{r.crop_type ?? 'all'}</td>
                      <td className="px-4 py-3">{r.action_type}</td>
                      <td className="px-4 py-3 capitalize">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {weatherRules.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">
                  No weather rules — apply OS foundation migration.
                </p>
              ) : null}
            </TableSection>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-50 py-2">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

function TableSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-900">{title}</h2>
      {children}
    </section>
  );
}
