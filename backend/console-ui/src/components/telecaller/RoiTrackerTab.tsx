import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';

type RoiEntry = {
  id: string;
  entryDate: string;
  category: string;
  comments: string | null;
  debitInr: number | null;
  creditInr: number | null;
  staffEditUsed: boolean;
  staffEditedBy: string | null;
};

type Props = {
  leadId: string;
  canWrite: boolean;
};

const CATEGORIES = ['labour', 'purchase', 'misc', 'harvest', 'income'] as const;

export function RoiTrackerTab({ leadId, canWrite }: Props) {
  const base = '/morbeez-staff/api/v1/os/telecaller';
  const [entries, setEntries] = useState<RoiEntry[]>([]);
  const [summary, setSummary] = useState({ debits: 0, credits: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [category, setCategory] = useState<string>('labour');
  const [comments, setComments] = useState('');
  const [debitInr, setDebitInr] = useState('');
  const [creditInr, setCreditInr] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api<{
        ok: boolean;
        entries: RoiEntry[];
        summary: { debits: number; credits: number; balance: number };
      }>(`${base}/leads/${leadId}/roi-entries`);
      setEntries(res.entries ?? []);
      setSummary(res.summary ?? { debits: 0, credits: 0, balance: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load ROI entries');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(row: RoiEntry) {
    if (row.staffEditUsed) {
      setError('This entry was already edited once.');
      return;
    }
    setEditId(row.id);
    setEntryDate(row.entryDate);
    setCategory(row.category);
    setComments(row.comments ?? '');
    setDebitInr(row.debitInr != null ? String(row.debitInr) : '');
    setCreditInr(row.creditInr != null ? String(row.creditInr) : '');
    setPassword('');
    setError('');
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !password.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api(`${base}/leads/${leadId}/roi-entries/${editId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          password: password.trim(),
          entryDate: entryDate || undefined,
          category,
          comments: comments.trim() || null,
          debitInr: debitInr.trim() ? Number(debitInr) : null,
          creditInr: creditInr.trim() ? Number(creditInr) : null,
        }),
      });
      setEditId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="tc-muted p-4">Loading ROI tracker…</p>;

  return (
    <div className="tc-roi-tab p-4">
      <div className="tc-roi-summary mb-4 grid gap-3 sm:grid-cols-3">
        <article className="tc-dashboard-card">
          <span className="text-xs uppercase text-slate-500">Expense</span>
          <strong className="block text-lg">₹{summary.debits.toFixed(0)}</strong>
        </article>
        <article className="tc-dashboard-card">
          <span className="text-xs uppercase text-slate-500">Income</span>
          <strong className="block text-lg">₹{summary.credits.toFixed(0)}</strong>
        </article>
        <article className="tc-dashboard-card">
          <span className="text-xs uppercase text-slate-500">Profit</span>
          <strong className="block text-lg text-emerald-700">₹{summary.balance.toFixed(0)}</strong>
        </article>
      </div>

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

      <p className="mb-3 text-sm text-slate-600">
        Farmers add entries via WhatsApp. Telecallers may correct each row once using their login password.
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Comments</th>
              <th className="px-3 py-2">Expense</th>
              <th className="px-3 py-2">Income</th>
              <th className="px-3 py-2">Edited</th>
              {canWrite ? <th className="px-3 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {entries.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{row.entryDate}</td>
                <td className="px-3 py-2 capitalize">{row.category}</td>
                <td className="px-3 py-2 max-w-[200px] truncate">{row.comments ?? '—'}</td>
                <td className="px-3 py-2">{row.debitInr != null ? `₹${row.debitInr}` : '—'}</td>
                <td className="px-3 py-2">{row.creditInr != null ? `₹${row.creditInr}` : '—'}</td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {row.staffEditUsed ? `Yes (${row.staffEditedBy ?? 'staff'})` : '—'}
                </td>
                {canWrite ? (
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs text-emerald-700 hover:underline disabled:text-slate-400"
                      disabled={row.staffEditUsed}
                      onClick={() => startEdit(row)}
                    >
                      Edit once
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
            {entries.length === 0 ? (
              <tr>
                <td colSpan={canWrite ? 7 : 6} className="px-3 py-6 text-center text-slate-500">
                  No ROI entries yet. Farmer can log via WhatsApp ROI Tracker.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editId && canWrite ? (
        <form onSubmit={saveEdit} className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <h4 className="mb-3 font-medium text-slate-800">One-time correction (previous value stored in audit)</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Date
              <input
                type="date"
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Category
              <select
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              Comments
              <input
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Expense ₹
              <input
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
                value={debitInr}
                onChange={(e) => setDebitInr(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Income ₹
              <input
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
                value={creditInr}
                onChange={(e) => setCreditInr(e.target.value)}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Your staff password (required)
              <input
                type="password"
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save correction'}
            </button>
            <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => setEditId(null)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
