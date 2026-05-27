import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

type Tab = 'orders' | 'farmers' | 'products' | 'inventory';

type Order = {
  id: string;
  displayOrderId: string;
  farmerName: string;
  phone: string | null;
  totalAmount: number;
  status: string;
  paymentLabel: string;
  createdAt: string;
};

type Farmer = {
  id: string;
  displayName: string;
  phone: string | null;
  district: string | null;
  state: string | null;
  status: string;
};

type Product = {
  id: string;
  title: string;
  status: string;
  inventory: number;
  vendor?: string;
};

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'orders', label: 'Orders' },
  { id: 'farmers', label: 'Farmers' },
  { id: 'products', label: 'Products' },
  { id: 'inventory', label: 'Inventory' },
];

export function CommerceHubPage() {
  const [tab, setTab] = useState<Tab>('orders');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<
    Array<{ title: string; sku: string; inventory: number; status: string }>
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const q = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : '';
    try {
      if (tab === 'orders') {
        const d = await api<{ ok: boolean; orders: Order[] }>(
          `/console/api/v1/orders?limit=40${q}`
        );
        setOrders(d.orders ?? []);
      } else if (tab === 'farmers') {
        const d = await api<{ ok: boolean; farmers: Farmer[] }>(
          `/console/api/v1/farmers?limit=40${q}`
        );
        setFarmers(d.farmers ?? []);
      } else if (tab === 'products') {
        const d = await api<{ ok: boolean; products: Product[] }>(
          `/console/api/v1/products?limit=40${q}`
        );
        setProducts(d.products ?? []);
      } else {
        const d = await api<{
          ok: boolean;
          rows: Array<{ title: string; variant: string; stock: number; status: string; batchNo: string }>;
        }>(`/console/api/v1/inventory?limit=40${q}`);
        setInventory(
          (d.rows ?? []).map((r) => ({
            title: `${r.title} (${r.variant})`,
            sku: r.batchNo,
            inventory: r.stock,
            status: r.status,
          }))
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Commerce</h1>
      <p className="mt-1 text-sm text-slate-600">
        Orders, farmers, and Shopify catalog — replaces legacy admin commerce views
      </p>

      <div className="mt-4 flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === t.id
                ? 'bg-emerald-50 font-medium text-emerald-800'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        type="search"
        placeholder="Search…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}

      {!loading && tab === 'orders' ? (
        <Table
          headers={['Order', 'Farmer', 'Amount', 'Status', 'Payment', 'When']}
          rows={orders.map((o) => [
            o.displayOrderId,
            `${o.farmerName}\n${o.phone ?? ''}`,
            `₹${o.totalAmount}`,
            o.status,
            o.paymentLabel,
            new Date(o.createdAt).toLocaleDateString('en-IN'),
          ])}
          empty="No orders found."
        />
      ) : null}

      {!loading && tab === 'farmers' ? (
        <Table
          headers={['Name', 'Phone', 'District', 'State', 'Status']}
          rows={farmers.map((f) => [
            f.displayName,
            f.phone ?? '—',
            f.district ?? '—',
            f.state ?? '—',
            f.status,
          ])}
          empty="No farmers found."
        />
      ) : null}

      {!loading && tab === 'products' ? (
        <Table
          headers={['Product', 'Status', 'Stock', 'Vendor']}
          rows={products.map((p) => [
            p.title,
            p.status,
            String(p.inventory ?? 0),
            p.vendor ?? '—',
          ])}
          empty="No products — check Shopify connection."
        />
      ) : null}

      {!loading && tab === 'inventory' ? (
        <Table
          headers={['Product', 'SKU', 'Stock', 'Status']}
          rows={inventory.map((i) => [i.title, i.sku, String(i.inventory), i.status])}
          empty="No inventory rows."
        />
      ) : null}

      <p className="mt-6 text-xs text-slate-500">
        Advanced product wizard, offers, combos, and flash sales APIs remain at{' '}
        <code className="rounded bg-slate-100 px-1">/console/api/v1/*</code> for automation; add
        React screens here when needed.
      </p>
    </div>
  );
}

function Table({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: string[][];
  empty: string;
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-slate-100">
              {row.map((cell, j) => (
                <td key={j} className="whitespace-pre-wrap px-4 py-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">{empty}</p>
      ) : null}
    </div>
  );
}
