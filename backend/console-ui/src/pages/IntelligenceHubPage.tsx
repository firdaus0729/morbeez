import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useSyncConsoleSearchMode } from '../hooks/useSyncConsoleSearch';
import { defaultsForPage } from '../lib/console-page-search';
import { matchesSearch } from '../lib/search-filter';
import { PincodeLookupPage } from './PincodeLookupPage';
import { Field, Modal, inputClass } from '../components/Modal';
import { Alert, HubTabs, PageShell, ReadOnlyBanner } from '../components/ui';

const base = '/morbeez-staff/api/v1/os/intelligence';
const CROPS = ['ginger', 'banana', 'cardamom', 'pepper', 'tomato', 'chilli', 'brinjal', 'all'];

type Tab =
  | 'pincode'
  | 'weather'
  | 'cultivation'
  | 'templates'
  | 'spray'
  | 'rotation';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'pincode', label: 'Pincode' },
  { id: 'weather', label: 'Weather rules' },
  { id: 'cultivation', label: 'Cultivation tasks' },
  { id: 'templates', label: 'Rec. templates' },
  { id: 'spray', label: 'Spray compatibility' },
  { id: 'rotation', label: 'Resistance rotation' },
];

export function IntelligenceHubPage({ canWrite }: { canWrite: boolean }) {
  const [tab, setTab] = useState<Tab>('weather');
  const [search, setSearch] = useState('');
  const [cropFilter, setCropFilter] = useState('');
  const searchDefaults = defaultsForPage('intelligence');
  useSyncConsoleSearchMode(
    tab === 'pincode' ? 'none' : 'local',
    search,
    setSearch,
    searchDefaults.placeholder ?? 'Search rules, templates, tasks…'
  );

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [weatherRules, setWeatherRules] = useState<Array<Record<string, unknown>>>([]);
  const [cultTasks, setCultTasks] = useState<Array<Record<string, unknown>>>([]);
  const [templates, setTemplates] = useState<Array<Record<string, unknown>>>([]);
  const [sprayRules, setSprayRules] = useState<Array<Record<string, unknown>>>([]);
  const [rotation, setRotation] = useState<Array<Record<string, unknown>>>([]);

  function filterRows(rows: Array<Record<string, unknown>>) {
    if (!search.trim()) return rows;
    return rows.filter((r) =>
      matchesSearch(
        search,
        ...Object.values(r).map((v) =>
          v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
        )
      )
    );
  }

  const visibleWeatherRules = useMemo(() => filterRows(weatherRules), [weatherRules, search]);
  const visibleCultTasks = useMemo(() => filterRows(cultTasks), [cultTasks, search]);
  const visibleTemplates = useMemo(() => filterRows(templates), [templates, search]);
  const visibleSprayRules = useMemo(() => filterRows(sprayRules), [sprayRules, search]);
  const visibleRotation = useMemo(() => filterRows(rotation), [rotation, search]);

  const [modal, setModal] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);

  const bump = () => setReloadKey((k) => k + 1);

  const load = useCallback(async () => {
    if (tab === 'pincode') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const cropQ = cropFilter ? `&crop=${encodeURIComponent(cropFilter)}` : '';
    try {
      if (tab === 'weather') {
        const d = await api<{ ok: boolean; rules: Array<Record<string, unknown>> }>(
          `${base}/weather-rules?status=all${cropQ}`
        );
        setWeatherRules(d.rules ?? []);
      } else if (tab === 'cultivation') {
        const d = await api<{ ok: boolean; tasks: Array<Record<string, unknown>> }>(
          `${base}/cultivation-tasks?${cropQ.replace('&', '')}`
        );
        setCultTasks(d.tasks ?? []);
      } else if (tab === 'templates') {
        const d = await api<{ ok: boolean; templates: Array<Record<string, unknown>> }>(
          `${base}/recommendation-templates?status=all${cropQ}`
        );
        setTemplates(d.templates ?? []);
      } else if (tab === 'spray') {
        const d = await api<{ ok: boolean; rules: Array<Record<string, unknown>> }>(
          `${base}/spray-compatibility`
        );
        setSprayRules(d.rules ?? []);
      } else if (tab === 'rotation') {
        const d = await api<{ ok: boolean; rows: Array<Record<string, unknown>> }>(
          `${base}/resistance-rotation?${cropQ.replace('&', '')}`
        );
        setRotation(d.rows ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tab, cropFilter, reloadKey]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(resource: string, id: string) {
    if (!canWrite || !confirm('Delete this row?')) return;
    try {
      await api(`${base}/${resource}/${id}`, { method: 'DELETE' });
      bump();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <div className="intelligence-hub">
      <p className="muted" style={{ marginBottom: 12 }}>
        Masters for rules, cultivation schedules, templates, and spray programs
      </p>
      {!canWrite ? <ReadOnlyBanner /> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      <HubTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab !== 'pincode' && tab !== 'spray' ? (
        <div className="mt-4 flex items-center gap-2">
          <label className="text-sm text-slate-600">Crop filter</label>
          <select
            className="rounded border border-slate-200 px-2 py-1 text-sm"
            value={cropFilter}
            onChange={(e) => setCropFilter(e.target.value)}
          >
            <option value="">All crops</option>
            {CROPS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {canWrite ? (
            <button
              type="button"
              onClick={() => {
                setEditRow(null);
                setModal(tab);
              }}
              className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              + Add
            </button>
          ) : null}
        </div>
      ) : null}

      {tab === 'spray' && canWrite ? (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setEditRow(null);
              setModal('spray');
            }}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            + Add rule
          </button>
        </div>
      ) : null}

      {tab === 'pincode' ? (
        <div className="mt-4">
          <PincodeLookupPage embedded />
        </div>
      ) : (
        <PageShell loading={loading} error={null} loadingLabel="Loading masters…">
      {tab === 'weather' ? (
        <MasterTable
          headers={['Rule key', 'Crop', 'Action', 'Status', 'Priority', '']}
          rows={visibleWeatherRules.map((r) => [
            `${r.rule_key} v${r.version}`,
            String(r.crop_type ?? 'all'),
            String(r.action_type),
            String(r.status),
            String(r.priority),
            r.id as string,
          ])}
          canWrite={canWrite}
          resource="weather-rules"
          onEdit={(id) => {
            setEditRow(weatherRules.find((x) => x.id === id) ?? null);
            setModal('weather');
          }}
          onDelete={remove}
        />
      ) : null}

      {tab === 'cultivation' ? (
        <MasterTable
          headers={['Crop', 'Task', 'Title', 'DAP range', 'Active', '']}
          rows={visibleCultTasks.map((r) => [
            String(r.crop_type),
            String(r.task_key),
            String(r.title_en),
            r.target_dap_min != null
              ? `${r.target_dap_min}–${r.target_dap_max ?? '∞'}`
              : '—',
            r.active ? 'Yes' : 'No',
            r.id as string,
          ])}
          canWrite={canWrite}
          resource="cultivation-tasks"
          onEdit={(id) => {
            setEditRow(cultTasks.find((x) => x.id === id) ?? null);
            setModal('cultivation');
          }}
          onDelete={remove}
        />
      ) : null}

      {tab === 'templates' ? (
        <MasterTable
          headers={['Crop', 'Issue', 'Recommendation', 'Status', '']}
          rows={visibleTemplates.map((r) => [
            String(r.crop_type),
            String(r.issue_label_en ?? r.issue_key),
            String(r.recommendation_text_en).slice(0, 60) + '…',
            String(r.status),
            r.id as string,
          ])}
          canWrite={canWrite}
          resource="recommendation-templates"
          onEdit={(id) => {
            setEditRow(templates.find((x) => x.id === id) ?? null);
            setModal('templates');
          }}
          onDelete={remove}
        />
      ) : null}

      {tab === 'spray' ? (
        <MasterTable
          headers={['Product A', 'Product B', 'Compatible', 'Gap (hrs)', '']}
          rows={visibleSprayRules.map((r) => [
            String(r.product_a),
            String(r.product_b),
            r.compatible ? 'Yes' : 'No',
            String(r.min_interval_hours ?? '—'),
            r.id as string,
          ])}
          canWrite={canWrite}
          resource="spray-compatibility"
          onEdit={(id) => {
            setEditRow(sprayRules.find((x) => x.id === id) ?? null);
            setModal('spray');
          }}
          onDelete={remove}
        />
      ) : null}

      {tab === 'rotation' ? (
        <MasterTable
          headers={['Crop', 'MoA', 'Order', 'Technical', '']}
          rows={visibleRotation.map((r) => [
            String(r.crop_type),
            String(r.mode_of_action),
            String(r.rotation_order),
            String(r.technical_name),
            r.id as string,
          ])}
          canWrite={canWrite}
          resource="resistance-rotation"
          onEdit={(id) => {
            setEditRow(rotation.find((x) => x.id === id) ?? null);
            setModal('rotation');
          }}
          onDelete={remove}
        />
      ) : null}
        </PageShell>
      )}

      {modal ? (
        <IntelligenceFormModal
          kind={modal}
          row={editRow}
          canWrite={canWrite}
          onClose={() => {
            setModal(null);
            setEditRow(null);
          }}
          onSaved={() => {
            setModal(null);
            setEditRow(null);
            bump();
          }}
        />
      ) : null}
    </div>
  );
}

function MasterTable({
  headers,
  rows,
  canWrite,
  resource,
  onEdit,
  onDelete,
}: {
  headers: string[];
  rows: (string | number)[][];
  canWrite: boolean;
  resource: string;
  onEdit: (id: string) => void;
  onDelete: (resource: string, id: string) => void;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
          {rows.map((row, i) => {
            const id = String(row[row.length - 1]);
            const cells = row.slice(0, -1);
            return (
              <tr key={i} className="border-t border-slate-100">
                {cells.map((c, j) => (
                  <td key={j} className="px-4 py-3">
                    {c}
                  </td>
                ))}
                {canWrite ? (
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="mr-2 text-xs text-emerald-700 hover:underline"
                      onClick={() => onEdit(id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => onDelete(resource, id)}
                    >
                      Del
                    </button>
                  </td>
                ) : (
                  <td />
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">
          No rows — apply migration 20260610000000_ag_intelligence_masters.sql if empty.
        </p>
      ) : null}
    </div>
  );
}

function IntelligenceFormModal({
  kind,
  row,
  onClose,
  onSaved,
}: {
  kind: string;
  row: Record<string, unknown> | null;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const [f, setF] = useState(() => initForm(kind, row));

  async function save() {
    setSaving(true);
    setErr('');
    try {
      if (kind === 'weather') {
        await api(`${base}/weather-rules`, {
          method: 'POST',
          body: JSON.stringify({
            id: row?.id,
            ruleKey: f.ruleKey,
            cropType: f.cropType || null,
            actionType: f.actionType,
            conditionJson: JSON.parse(f.conditionJson || '{}'),
            actionPayload: JSON.parse(f.actionPayload || '{}'),
            priority: Number(f.priority) || 50,
            status: f.status,
            notes: f.notes,
          }),
        });
      } else if (kind === 'cultivation') {
        await api(`${base}/cultivation-tasks`, {
          method: 'POST',
          body: JSON.stringify({
            id: row?.id,
            cropType: f.cropType,
            taskKey: f.taskKey,
            titleEn: f.titleEn,
            instructionsEn: f.instructionsEn,
            targetDapMin: f.dapMin ? Number(f.dapMin) : null,
            targetDapMax: f.dapMax ? Number(f.dapMax) : null,
            priority: Number(f.priority) || 50,
            active: f.active === 'true',
          }),
        });
      } else if (kind === 'templates') {
        await api(`${base}/recommendation-templates`, {
          method: 'POST',
          body: JSON.stringify({
            id: row?.id,
            cropType: f.cropType,
            issueKey: f.issueKey,
            issueLabelEn: f.issueLabelEn,
            recommendationTextEn: f.recText,
            status: f.status,
            products: JSON.parse(f.products || '[]'),
          }),
        });
      } else if (kind === 'spray') {
        await api(`${base}/spray-compatibility`, {
          method: 'POST',
          body: JSON.stringify({
            id: row?.id,
            productA: f.productA,
            productB: f.productB,
            compatible: f.compatible === 'true',
            minIntervalHours: f.interval ? Number(f.interval) : null,
            notes: f.notes,
          }),
        });
      } else if (kind === 'rotation') {
        await api(`${base}/resistance-rotation`, {
          method: 'POST',
          body: JSON.stringify({
            id: row?.id,
            cropType: f.cropType,
            modeOfAction: f.moa,
            rotationOrder: Number(f.order) || 1,
            technicalName: f.technical,
            notes: f.notes,
          }),
        });
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const title =
    kind === 'weather'
      ? 'Weather rule'
      : kind === 'cultivation'
        ? 'Cultivation task'
        : kind === 'templates'
          ? 'Recommendation template'
          : kind === 'spray'
            ? 'Spray compatibility'
            : 'Resistance rotation';

  return (
    <Modal title={row ? `Edit ${title}` : `Add ${title}`} onClose={onClose} onSave={save} saving={saving}>
      {err ? <p className="mb-3 text-sm text-red-600">{err}</p> : null}
      <div className="space-y-3 max-h-[50vh] overflow-y-auto">
        {kind === 'weather' ? (
          <>
            <Field label="Rule key">
              <input className={inputClass} value={f.ruleKey} onChange={(e) => setF({ ...f, ruleKey: e.target.value })} />
            </Field>
            <Field label="Crop (blank = all)">
              <input className={inputClass} value={f.cropType} onChange={(e) => setF({ ...f, cropType: e.target.value })} />
            </Field>
            <Field label="Action type">
              <select className={inputClass} value={f.actionType} onChange={(e) => setF({ ...f, actionType: e.target.value })}>
                {['block_action', 'recommend_task', 'warn'].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Condition JSON">
              <textarea className={inputClass} rows={2} value={f.conditionJson} onChange={(e) => setF({ ...f, conditionJson: e.target.value })} />
            </Field>
            <Field label="Action payload JSON">
              <textarea className={inputClass} rows={2} value={f.actionPayload} onChange={(e) => setF({ ...f, actionPayload: e.target.value })} />
            </Field>
            <Field label="Status">
              <select className={inputClass} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                {['draft', 'approved', 'archived'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </>
        ) : null}
        {kind === 'cultivation' ? (
          <>
            <Field label="Crop">
              <input className={inputClass} value={f.cropType} onChange={(e) => setF({ ...f, cropType: e.target.value })} />
            </Field>
            <Field label="Task key">
              <input className={inputClass} value={f.taskKey} onChange={(e) => setF({ ...f, taskKey: e.target.value })} />
            </Field>
            <Field label="Title (EN)">
              <input className={inputClass} value={f.titleEn} onChange={(e) => setF({ ...f, titleEn: e.target.value })} />
            </Field>
            <Field label="Instructions (EN)">
              <textarea className={inputClass} rows={2} value={f.instructionsEn} onChange={(e) => setF({ ...f, instructionsEn: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="DAP min">
                <input className={inputClass} value={f.dapMin} onChange={(e) => setF({ ...f, dapMin: e.target.value })} />
              </Field>
              <Field label="DAP max">
                <input className={inputClass} value={f.dapMax} onChange={(e) => setF({ ...f, dapMax: e.target.value })} />
              </Field>
            </div>
          </>
        ) : null}
        {kind === 'templates' ? (
          <>
            <Field label="Crop">
              <input className={inputClass} value={f.cropType} onChange={(e) => setF({ ...f, cropType: e.target.value })} />
            </Field>
            <Field label="Issue key">
              <input className={inputClass} value={f.issueKey} onChange={(e) => setF({ ...f, issueKey: e.target.value })} />
            </Field>
            <Field label="Issue label">
              <input className={inputClass} value={f.issueLabelEn} onChange={(e) => setF({ ...f, issueLabelEn: e.target.value })} />
            </Field>
            <Field label="Recommendation text">
              <textarea className={inputClass} rows={3} value={f.recText} onChange={(e) => setF({ ...f, recText: e.target.value })} />
            </Field>
            <Field label="Products JSON">
              <textarea className={inputClass} rows={2} value={f.products} onChange={(e) => setF({ ...f, products: e.target.value })} />
            </Field>
            <Field label="Status">
              <select className={inputClass} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                {['draft', 'approved', 'archived'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </>
        ) : null}
        {kind === 'spray' ? (
          <>
            <Field label="Product A">
              <input className={inputClass} value={f.productA} onChange={(e) => setF({ ...f, productA: e.target.value })} />
            </Field>
            <Field label="Product B">
              <input className={inputClass} value={f.productB} onChange={(e) => setF({ ...f, productB: e.target.value })} />
            </Field>
            <Field label="Compatible">
              <select className={inputClass} value={f.compatible} onChange={(e) => setF({ ...f, compatible: e.target.value })}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </Field>
            <Field label="Min interval (hours)">
              <input className={inputClass} value={f.interval} onChange={(e) => setF({ ...f, interval: e.target.value })} />
            </Field>
          </>
        ) : null}
        {kind === 'rotation' ? (
          <>
            <Field label="Crop">
              <input className={inputClass} value={f.cropType} onChange={(e) => setF({ ...f, cropType: e.target.value })} />
            </Field>
            <Field label="Mode of action">
              <input className={inputClass} value={f.moa} onChange={(e) => setF({ ...f, moa: e.target.value })} />
            </Field>
            <Field label="Rotation order">
              <input className={inputClass} value={f.order} onChange={(e) => setF({ ...f, order: e.target.value })} />
            </Field>
            <Field label="Technical name">
              <input className={inputClass} value={f.technical} onChange={(e) => setF({ ...f, technical: e.target.value })} />
            </Field>
          </>
        ) : null}
      </div>
    </Modal>
  );
}

function initForm(kind: string, row: Record<string, unknown> | null): Record<string, string> {
  if (!row) {
    return {
      ruleKey: '',
      cropType: 'ginger',
      actionType: 'recommend_task',
      conditionJson: '{"rain_probability_pct":{"gt":70}}',
      actionPayload: '{"task":"drainage_cleaning"}',
      status: 'draft',
      priority: '50',
      notes: '',
      taskKey: '',
      titleEn: '',
      instructionsEn: '',
      dapMin: '',
      dapMax: '',
      issueKey: '',
      issueLabelEn: '',
      recText: '',
      products: '[]',
      productA: '',
      productB: '',
      compatible: 'false',
      interval: '168',
      moa: 'QoI',
      order: '1',
      technical: '',
      active: 'true',
    };
  }
  if (kind === 'weather') {
    return {
      ruleKey: String(row.rule_key ?? ''),
      cropType: String(row.crop_type ?? ''),
      actionType: String(row.action_type ?? ''),
      conditionJson: JSON.stringify(row.condition_json ?? {}, null, 2),
      actionPayload: JSON.stringify(row.action_payload ?? {}, null, 2),
      status: String(row.status ?? 'draft'),
      priority: String(row.priority ?? 50),
      notes: String(row.notes ?? ''),
    };
  }
  if (kind === 'cultivation') {
    return {
      cropType: String(row.crop_type ?? ''),
      taskKey: String(row.task_key ?? ''),
      titleEn: String(row.title_en ?? ''),
      instructionsEn: String(row.instructions_en ?? ''),
      dapMin: row.target_dap_min != null ? String(row.target_dap_min) : '',
      dapMax: row.target_dap_max != null ? String(row.target_dap_max) : '',
      priority: String(row.priority ?? 50),
      active: row.active ? 'true' : 'false',
    };
  }
  if (kind === 'templates') {
    return {
      cropType: String(row.crop_type ?? ''),
      issueKey: String(row.issue_key ?? ''),
      issueLabelEn: String(row.issue_label_en ?? ''),
      recText: String(row.recommendation_text_en ?? ''),
      products: JSON.stringify(row.products ?? [], null, 2),
      status: String(row.status ?? 'draft'),
    };
  }
  if (kind === 'spray') {
    return {
      productA: String(row.product_a ?? ''),
      productB: String(row.product_b ?? ''),
      compatible: row.compatible ? 'true' : 'false',
      interval: row.min_interval_hours != null ? String(row.min_interval_hours) : '',
      notes: String(row.notes ?? ''),
    };
  }
  return {
    cropType: String(row.crop_type ?? ''),
    moa: String(row.mode_of_action ?? ''),
    order: String(row.rotation_order ?? 1),
    technical: String(row.technical_name ?? ''),
    notes: String(row.notes ?? ''),
  };
}
