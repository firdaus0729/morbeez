import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Gap = {
  id: string;
  technical_name: string;
  crop_type: string | null;
  district: string | null;
  recommendation_count: number;
  urgency: string;
  status: string;
};

export function ProductGapsPage() {
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ ok: boolean; gaps: Gap[] }>('/console/api/v1/os/product-gaps')
      .then((d) => setGaps(d.gaps ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Product gap queue</h1>
      <p className="mt-1 text-sm text-slate-600">
        Technicals requested ≥5 times — portfolio sourcing signal for admin
      </p>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Technical</th>
              <th className="px-4 py-3">Crop</th>
              <th className="px-4 py-3">District</th>
              <th className="px-4 py-3">Count</th>
              <th className="px-4 py-3">Urgency</th>
            </tr>
          </thead>
          <tbody>
            {gaps.map((g) => (
              <tr key={g.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{g.technical_name}</td>
                <td className="px-4 py-3">{g.crop_type ?? '—'}</td>
                <td className="px-4 py-3">{g.district ?? '—'}</td>
                <td className="px-4 py-3">{g.recommendation_count}</td>
                <td className="px-4 py-3 capitalize">{g.urgency}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {gaps.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">No gaps at threshold yet.</p>
        ) : null}
      </div>
    </div>
  );
}
