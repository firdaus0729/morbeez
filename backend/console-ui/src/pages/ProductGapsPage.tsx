import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Alert, DataTable, EmptyState, PageShell, Panel, TableWrap } from '../components/ui';

type Gap = {
  id: string;
  technical_name: string;
  crop_type: string | null;
  district: string | null;
  recommendation_count: number;
  urgency: string;
};

export function ProductGapsPage() {
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api<{ ok: boolean; gaps: Gap[] }>('/console/api/v1/os/product-gaps')
      .then((d) => setGaps(d.gaps ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <p className="muted" style={{ marginBottom: 16 }}>
        Technicals requested ≥5 times — portfolio sourcing signal
      </p>
      <PageShell loading={loading} error={error || null} loadingLabel="Loading product gaps…">
      <Panel title="Product gap queue">
        <TableWrap>
          <DataTable>
            <thead>
              <tr>
                <th>Technical</th>
                <th>Crop</th>
                <th>District</th>
                <th>Count</th>
                <th>Urgency</th>
              </tr>
            </thead>
            <tbody>
              {gaps.map((g) => (
                <tr key={g.id}>
                  <td>
                    <strong>{g.technical_name}</strong>
                  </td>
                  <td>{g.crop_type ?? '—'}</td>
                  <td>{g.district ?? '—'}</td>
                  <td>{g.recommendation_count}</td>
                  <td className="capitalize">{g.urgency}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </TableWrap>
        {gaps.length === 0 ? <EmptyState>No gaps at threshold yet.</EmptyState> : null}
      </Panel>
      </PageShell>
    </div>
  );
}
