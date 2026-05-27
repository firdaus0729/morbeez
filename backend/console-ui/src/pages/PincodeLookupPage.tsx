import { useState } from 'react';
import { api } from '../lib/api';
import { PageLoader } from '../components/ui';

type Pincode = {
  pincode: string;
  village: string | null;
  taluk: string;
  district: string;
  state: string;
};

export function PincodeLookupPage({ embedded }: { embedded?: boolean } = {}) {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<Pincode | null>(null);
  const [error, setError] = useState('');

  async function lookup() {
    setError('');
    setResult(null);
    try {
      const data = await api<{ ok: boolean; pincode: Pincode | null }>(
        `/console/api/v1/os/pincodes/lookup/${code.replace(/\D/g, '').slice(0, 6)}`
      );
      setResult(data.pincode);
      if (!data.pincode) setError('Pincode not in master — import via Supabase');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed');
    } finally {
      setLooking(false);
    }
  }

  return (
    <div>
      {!embedded ? (
        <>
          <h1 className="text-2xl font-semibold text-slate-900">Pincode → district</h1>
          <p className="mt-1 text-sm text-slate-600">Normalized geography for analytics and farmer profiles</p>
        </>
      ) : null}

      <div className={`${embedded ? '' : 'mt-6 '}flex max-w-md gap-2`}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="685612"
          maxLength={6}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={lookup}
          disabled={looking || code.replace(/\D/g, '').length < 6}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {looking ? 'Looking up…' : 'Lookup'}
        </button>
      </div>

      {looking ? <PageLoader label="Looking up pincode…" compact className="mt-6" /> : null}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {result ? (
        <dl className="mt-6 max-w-lg rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <dt className="text-slate-500">Pincode</dt>
            <dd className="font-medium">{result.pincode}</dd>
            <dt className="text-slate-500">Village</dt>
            <dd>{result.village ?? '—'}</dd>
            <dt className="text-slate-500">Taluk</dt>
            <dd>{result.taluk}</dd>
            <dt className="text-slate-500">District</dt>
            <dd className="font-medium text-emerald-800">{result.district}</dd>
            <dt className="text-slate-500">State</dt>
            <dd>{result.state}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}
