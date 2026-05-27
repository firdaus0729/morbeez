import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Dashboard = {
  kpis: {
    farmers: number;
    farmersTrend: number;
    revenueInr: number;
    revenueTrend: number;
    orders: number;
    ordersTrend: number;
    conversionTrend: number;
    aiDiagnoses: number;
  };
  alerts: {
    lowStock: number;
    outOfStock: number;
    pendingOrders: number;
  };
  salesChart: { labels: string[]; values: number[] };
  recentFarmers: Array<{ name: string; phone: string | null; district: string | null }>;
  recentOrders: Array<{ orderName: string | null; totalAmount: number; financialStatus: string | null }>;
};

export function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ ok: boolean } & Dashboard>('/console/api/v1/dashboard')
      .then((d) => setData(d))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Loading dashboard…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return null;

  const k = data.kpis;
  const maxSale = Math.max(1, ...data.salesChart.values);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-600">Commerce & farmer operations overview</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Farmers" value={String(k.farmers)} sub={`${k.farmersTrend}% vs prior week`} />
        <Card
          label="Revenue (paid)"
          value={`₹${Math.round(k.revenueInr).toLocaleString('en-IN')}`}
          sub={`${k.revenueTrend}% vs prior week`}
        />
        <Card label="Orders" value={String(k.orders)} sub={`${k.ordersTrend}% vs prior week`} />
        <Card label="AI diagnoses" value={String(k.aiDiagnoses)} />
      </div>

      {(data.alerts.lowStock > 0 || data.alerts.pendingOrders > 0) && (
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {data.alerts.pendingOrders > 0 ? (
            <span className="rounded-lg bg-amber-50 px-3 py-1 text-amber-900">
              {data.alerts.pendingOrders} pending checkouts
            </span>
          ) : null}
          {data.alerts.lowStock > 0 ? (
            <span className="rounded-lg bg-red-50 px-3 py-1 text-red-800">
              {data.alerts.lowStock} low-stock SKUs
            </span>
          ) : null}
        </div>
      )}

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-slate-900">Sales (last 7 days)</h2>
        <div className="mt-4 flex items-end gap-1" style={{ minHeight: 100 }}>
          {data.salesChart.values.map((v, i) => (
            <div key={data.salesChart.labels[i]} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-emerald-500"
                style={{ height: `${Math.max(4, (v / maxSale) * 80)}px` }}
              />
              <span className="text-[10px] text-slate-500">{data.salesChart.labels[i]}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ListSection title="Recent farmers" empty="No farmers yet.">
          {data.recentFarmers.map((f, i) => (
            <li key={i} className="border-t border-slate-100 py-2 text-sm">
              <span className="font-medium">{f.name}</span>
              <span className="block text-xs text-slate-500">
                {f.phone} · {f.district ?? '—'}
              </span>
            </li>
          ))}
        </ListSection>
        <ListSection title="Recent orders" empty="No orders yet.">
          {data.recentOrders.map((o, i) => (
            <li key={i} className="border-t border-slate-100 py-2 text-sm">
              <span className="font-medium">{o.orderName ?? 'Order'}</span>
              <span className="block text-xs text-slate-500">
                ₹{o.totalAmount} · {o.financialStatus ?? '—'}
              </span>
            </li>
          ))}
        </ListSection>
      </div>
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </article>
  );
}

function ListSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.some((c) => c != null);
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-medium text-slate-900">{title}</h2>
      {hasItems ? <ul className="mt-2">{children}</ul> : <p className="mt-2 text-sm text-slate-500">{empty}</p>}
    </section>
  );
}
