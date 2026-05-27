import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Block, Farmer } from '../App';

type Props = {
  email: string;
  canWrite: boolean;
  fieldApi: string;
  onStartVisit: (farmer: Farmer, block: Block) => void;
  onLogout: () => void;
};

export function HomePage({ email, canWrite, fieldApi, onStartVisit, onLogout }: Props) {
  const [query, setQuery] = useState('');
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [selected, setSelected] = useState<Farmer | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = useCallback(async () => {
    if (query.trim().length < 2) {
      setFarmers([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const d = await api<{ ok: boolean; farmers: Farmer[] }>(
        `${fieldApi}/farmers/search?q=${encodeURIComponent(query.trim())}`
      );
      setFarmers(d.farmers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [query, fieldApi]);

  useEffect(() => {
    const t = setTimeout(search, 350);
    return () => clearTimeout(t);
  }, [search]);

  async function pickFarmer(f: Farmer) {
    setSelected(f);
    setError('');
    try {
      const d = await api<{ ok: boolean; blocks: Block[] }>(
        `${fieldApi}/farmers/${f.id}/blocks`
      );
      setBlocks(d.blocks ?? []);
      if (!d.blocks?.length) setError('No farm blocks — add a block in CRM first.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load blocks');
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-emerald-800/20 bg-emerald-700 px-4 py-4 text-white shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase opacity-80">Field PWA</p>
            <h1 className="text-lg font-semibold">Find farmer</h1>
          </div>
          <button type="button" onClick={onLogout} className="text-sm underline opacity-90">
            Out
          </button>
        </div>
        <p className="mt-1 truncate text-xs opacity-75">{email}</p>
      </header>

      {!canWrite ? (
        <p className="mx-4 mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Read-only account — need agronomist write access to submit visits.
        </p>
      ) : null}

      {error ? <p className="mx-4 mt-4 text-sm text-red-600">{error}</p> : null}

      <main className="flex-1 p-4">
        <input
          type="search"
          placeholder="Phone, name, or district…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setBlocks([]);
          }}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base shadow-sm"
        />

        {loading ? <p className="mt-4 text-center text-sm text-slate-500">Searching…</p> : null}

        {!selected ? (
          <ul className="mt-4 space-y-2">
            {farmers.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => pickFarmer(f)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm active:bg-slate-50"
                >
                  <p className="font-medium text-slate-900">{f.name}</p>
                  <p className="text-sm text-slate-600">{f.phone ?? '—'}</p>
                  <p className="text-xs text-slate-500">
                    {[f.village, f.district].filter(Boolean).join(' · ')}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setBlocks([]);
              }}
              className="text-sm text-emerald-700"
            >
              ← Back to search
            </button>
            <p className="mt-2 font-medium text-slate-900">{selected.name}</p>
            <p className="text-sm text-slate-600">Select block for visit</p>
            <ul className="mt-3 space-y-2">
              {blocks.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    disabled={!canWrite}
                    onClick={() => onStartVisit(selected, b)}
                    className="w-full rounded-xl border border-emerald-200 bg-white p-4 text-left shadow-sm disabled:opacity-50"
                  >
                    <p className="font-medium">{b.name}</p>
                    <p className="text-sm text-slate-600">
                      {b.cropType}
                      {b.dap != null ? ` · DAP ${b.dap}` : ''}
                    </p>
                    {b.plotLabel ? (
                      <p className="text-xs text-slate-500">{b.plotLabel}</p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
