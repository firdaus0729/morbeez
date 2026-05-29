import { useState } from 'react';
import { api } from '../../lib/api';
import { Field, Modal, inputClass } from '../Modal';

const base = '/morbeez-staff/api/v1/os/operations';

const LANGS = ['en', 'ml', 'ta', 'kn', 'hi'] as const;
const CATEGORIES = ['general', 'telecaller', 'advisory', 'orders', 'broadcast'] as const;
const JOB_TYPES = [
  'follow_up_reminder',
  'callback_reminder',
  'whatsapp_follow_up',
  'seasonal_alert',
  'cultivation_application_prompt',
  'cultivation_result_validation',
];

type QuickReply = {
  id: string;
  shortcut_key: string;
  category: string;
  label_en: string;
  body_en: string;
  body_ml: string | null;
  active: boolean;
  sort_order: number;
};

type LangTemplate = {
  id: string;
  template_key: string;
  language: string;
  channel: string;
  body_text: string;
  meta_template_name: string | null;
  status: string;
  active: boolean;
};

type AutoJob = {
  id: string;
  job_type: string;
  status: string;
  scheduled_at: string;
  attempts: number;
  last_error: string | null;
  farmerName: string;
  farmerPhone: string | null;
  payload: Record<string, unknown>;
};

export function QuickRepliesPanel({
  replies,
  canWrite,
  category,
  onCategoryChange,
  onRefresh,
}: {
  replies: QuickReply[];
  canWrite: boolean;
  category: string;
  onCategoryChange: (c: string) => void;
  onRefresh: () => void;
}) {
  const [modal, setModal] = useState<QuickReply | null | 'new'>(null);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          className="rounded border border-slate-200 px-2 py-1 text-sm"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {canWrite ? (
          <button
            type="button"
            onClick={() => setModal('new')}
            className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            + Quick reply
          </button>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">EN preview</th>
              <th className="px-4 py-3">Category</th>
              {canWrite ? <th className="px-4 py-3" /> : null}
            </tr>
          </thead>
          <tbody>
            {replies.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-mono text-xs">{r.shortcut_key}</td>
                <td className="px-4 py-3">{r.label_en}</td>
                <td className="max-w-xs truncate px-4 py-3 text-slate-600">{r.body_en}</td>
                <td className="px-4 py-3 capitalize">{r.category}</td>
                {canWrite ? (
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-xs text-emerald-700 hover:underline"
                      onClick={() => setModal(r)}
                    >
                      Edit
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        {replies.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            No quick replies — apply migration 20260611000000_operations_messaging_masters.sql
          </p>
        ) : null}
      </div>
      {modal ? (
        <QuickReplyModal
          row={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            onRefresh();
          }}
        />
      ) : null}
    </div>
  );
}

function QuickReplyModal({
  row,
  onClose,
  onSaved,
}: {
  row: QuickReply | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [f, setF] = useState({
    shortcutKey: row?.shortcut_key ?? '',
    category: row?.category ?? 'general',
    labelEn: row?.label_en ?? '',
    bodyEn: row?.body_en ?? '',
    bodyMl: row?.body_ml ?? '',
    sortOrder: String(row?.sort_order ?? 0),
  });

  async function save() {
    setSaving(true);
    setErr('');
    try {
      await api(`${base}/quick-replies`, {
        method: 'POST',
        body: JSON.stringify({
          id: row?.id,
          shortcutKey: f.shortcutKey,
          category: f.category,
          labelEn: f.labelEn,
          bodyEn: f.bodyEn,
          bodyMl: f.bodyMl || undefined,
          sortOrder: Number(f.sortOrder) || 0,
        }),
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={row ? 'Edit quick reply' : 'Add quick reply'} onClose={onClose} onSave={save} saving={saving}>
      {err ? <p className="mb-3 text-sm text-red-600">{err}</p> : null}
      <div className="space-y-3">
        <Field label="Shortcut key (unique)">
          <input className={inputClass} value={f.shortcutKey} onChange={(e) => setF({ ...f, shortcutKey: e.target.value })} />
        </Field>
        <Field label="Category">
          <select className={inputClass} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Label (EN)">
          <input className={inputClass} value={f.labelEn} onChange={(e) => setF({ ...f, labelEn: e.target.value })} />
        </Field>
        <Field label="Message body (EN)">
          <textarea className={inputClass} rows={3} value={f.bodyEn} onChange={(e) => setF({ ...f, bodyEn: e.target.value })} />
        </Field>
        <Field label="Message body (ML)">
          <textarea className={inputClass} rows={2} value={f.bodyMl} onChange={(e) => setF({ ...f, bodyMl: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

export function LanguageTemplatesPanel({
  templates,
  canWrite,
  statusFilter,
  onStatusChange,
  onRefresh,
}: {
  templates: LangTemplate[];
  canWrite: boolean;
  statusFilter: string;
  onStatusChange: (s: string) => void;
  onRefresh: () => void;
}) {
  const [modal, setModal] = useState<LangTemplate | null | 'new'>(null);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          className="rounded border border-slate-200 px-2 py-1 text-sm"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          {['all', 'draft', 'approved', 'archived'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {canWrite ? (
          <button
            type="button"
            onClick={() => setModal('new')}
            className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            + Template
          </button>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Lang</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Body</th>
              <th className="px-4 py-3">Status</th>
              {canWrite ? <th className="px-4 py-3" /> : null}
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-mono text-xs">{t.template_key}</td>
                <td className="px-4 py-3 uppercase">{t.language}</td>
                <td className="px-4 py-3">{t.channel}</td>
                <td className="max-w-xs truncate px-4 py-3">{t.body_text}</td>
                <td className="px-4 py-3 capitalize">{t.status}</td>
                {canWrite ? (
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-xs text-emerald-700 hover:underline"
                      onClick={() => setModal(t)}
                    >
                      Edit
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal ? (
        <LangTemplateModal
          row={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            onRefresh();
          }}
        />
      ) : null}
    </div>
  );
}

function LangTemplateModal({
  row,
  onClose,
  onSaved,
}: {
  row: LangTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [f, setF] = useState({
    templateKey: row?.template_key ?? '',
    language: row?.language ?? 'en',
    channel: row?.channel ?? 'session',
    bodyText: row?.body_text ?? '',
    metaTemplateName: row?.meta_template_name ?? '',
    status: row?.status ?? 'draft',
  });

  async function save() {
    setSaving(true);
    setErr('');
    try {
      await api(`${base}/language-templates`, {
        method: 'POST',
        body: JSON.stringify({
          id: row?.id,
          templateKey: f.templateKey,
          language: f.language,
          channel: f.channel,
          bodyText: f.bodyText,
          metaTemplateName: f.metaTemplateName || undefined,
          status: f.status,
        }),
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={row ? 'Edit template' : 'Add template'} onClose={onClose} onSave={() => save()} saving={saving}>
      {err ? <p className="mb-3 text-sm text-red-600">{err}</p> : null}
      <p className="mb-3 text-xs text-slate-500">Use {'{{name}}'} for variables in session messages.</p>
      <div className="space-y-3">
        <Field label="Template key">
          <input className={inputClass} value={f.templateKey} onChange={(e) => setF({ ...f, templateKey: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Language">
            <select className={inputClass} value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}>
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Channel">
            <select className={inputClass} value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })}>
              <option value="session">session</option>
              <option value="meta_template">meta_template</option>
            </select>
          </Field>
        </div>
        <Field label="Body text">
          <textarea className={inputClass} rows={4} value={f.bodyText} onChange={(e) => setF({ ...f, bodyText: e.target.value })} />
        </Field>
        {f.channel === 'meta_template' ? (
          <Field label="Meta template name">
            <input
              className={inputClass}
              value={f.metaTemplateName}
              onChange={(e) => setF({ ...f, metaTemplateName: e.target.value })}
            />
          </Field>
        ) : null}
        <Field label="Status">
          <select className={inputClass} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            {['draft', 'approved', 'archived'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  );
}

export function AutomationJobsPanel({
  jobs,
  stats,
  canWrite,
  statusFilter,
  jobTypeFilter,
  onStatusChange,
  onJobTypeChange,
  onRefresh,
}: {
  jobs: AutoJob[];
  stats: Record<string, number> | null;
  canWrite: boolean;
  statusFilter: string;
  jobTypeFilter: string;
  onStatusChange: (s: string) => void;
  onJobTypeChange: (t: string) => void;
  onRefresh: () => void;
}) {
  const [error, setError] = useState('');

  async function cancel(id: string) {
    if (!canWrite) return;
    try {
      await api(`${base}/automation-jobs/${id}/cancel`, { method: 'POST', body: '{}' });
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed');
    }
  }

  async function retry(id: string) {
    if (!canWrite) return;
    try {
      await api(`${base}/automation-jobs/${id}/retry`, { method: 'POST', body: '{}' });
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Retry failed');
    }
  }

  return (
    <div>
      {stats ? (
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <StatChip label="Due now" value={stats.dueNow ?? 0} tone="amber" />
          <StatChip label="Pending" value={stats.pending ?? 0} />
          <StatChip label="Processing" value={stats.processing ?? 0} />
          <StatChip label="Failed" value={stats.failed ?? 0} tone="red" />
          <StatChip label="Completed" value={stats.completed ?? 0} tone="emerald" />
        </div>
      ) : null}
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          className="rounded border border-slate-200 px-2 py-1 text-sm"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          {['active', 'pending', 'processing', 'failed', 'completed', 'cancelled', 'all'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-slate-200 px-2 py-1 text-sm"
          value={jobTypeFilter}
          onChange={(e) => onJobTypeChange(e.target.value)}
        >
          <option value="all">All job types</option>
          {JOB_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Scheduled</th>
              <th className="px-4 py-3">Farmer</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Attempts</th>
              {canWrite ? <th className="px-4 py-3" /> : null}
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-xs whitespace-nowrap">
                  {new Date(j.scheduled_at).toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{j.farmerName}</p>
                  <p className="text-xs text-slate-500">{j.farmerPhone}</p>
                </td>
                <td className="px-4 py-3 text-xs">{j.job_type.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-1.5 py-0.5 text-xs capitalize ${statusClass(j.status)}`}>
                    {j.status}
                  </span>
                  {j.last_error ? (
                    <p className="mt-1 max-w-xs truncate text-xs text-red-600" title={j.last_error}>
                      {j.last_error}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3">{j.attempts}</td>
                {canWrite ? (
                  <td className="px-4 py-3">
                    {j.status === 'pending' || j.status === 'processing' ? (
                      <button
                        type="button"
                        className="mr-2 text-xs text-red-600 hover:underline"
                        onClick={() => cancel(j.id)}
                      >
                        Cancel
                      </button>
                    ) : null}
                    {j.status === 'failed' || j.status === 'cancelled' || j.status === 'completed' ? (
                      <button
                        type="button"
                        className="text-xs text-emerald-700 hover:underline"
                        onClick={() => retry(j.id)}
                      >
                        Retry
                      </button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        {jobs.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">No jobs in this filter.</p>
        ) : null}
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'amber' | 'red' | 'emerald';
}) {
  const cls =
    tone === 'amber'
      ? 'bg-amber-50 text-amber-900'
      : tone === 'red'
        ? 'bg-red-50 text-red-800'
        : tone === 'emerald'
          ? 'bg-emerald-50 text-emerald-800'
          : 'bg-slate-100 text-slate-700';
  return (
    <span className={`rounded-lg px-2 py-1 ${cls}`}>
      {label}: <strong>{value}</strong>
    </span>
  );
}

function statusClass(s: string) {
  if (s === 'failed') return 'bg-red-100 text-red-800';
  if (s === 'completed') return 'bg-emerald-100 text-emerald-800';
  if (s === 'pending') return 'bg-amber-100 text-amber-900';
  if (s === 'processing') return 'bg-blue-100 text-blue-800';
  return 'bg-slate-100 text-slate-700';
}
