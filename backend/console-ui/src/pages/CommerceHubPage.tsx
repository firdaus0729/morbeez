import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  Alert,
  DataTable,
  EmptyState,
  FilterBar,
  HubTabs,
  Input,
  Loading,
  Panel,
  TableWrap,
} from '../components/ui';

type Tab = 'orders' | 'farmers' | 'products' | 'inventory';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'orders', label: 'Orders' },
  { id: 'farmers', label: 'Farmers' },
  { id: 'products', label: 'Products' },
  { id: 'inventory', label: 'Inventory' },
];

export function CommerceHubPage({ canWrite = false }: { canWrite?: boolean }) {
  const [tab, setTab] = useState<Tab>('orders');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [farmers, setFarmers] = useState<Array<Record<string, unknown>>>([]);
  const [products, setProducts] = useState<Array<Record<string, unknown>>>([]);
  const [inventory, setInventory] = useState<Array<Record<string, unknown>>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const q = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : '';
    try {
      if (tab === 'orders') {
        const d = await api<{ ok: boolean; orders: Array<Record<string, unknown>> }>(
          `/console/api/v1/orders?limit=40${q}`
        );
        setOrders(d.orders ?? []);
      } else if (tab === 'farmers') {
        const d = await api<{ ok: boolean; farmers: Array<Record<string, unknown>> }>(
          `/console/api/v1/farmers?limit=40${q}`
        );
        setFarmers(d.farmers ?? []);
      } else if (tab === 'products') {
        const d = await api<{ ok: boolean; products: Array<Record<string, unknown>> }>(
          `/console/api/v1/products?limit=40${q}`
        );
        setProducts(d.products ?? []);
      } else {
        const d = await api<{ ok: boolean; rows: Array<Record<string, unknown>> }>(
          `/console/api/v1/inventory?limit=40${q}`
        );
        setInventory(d.rows ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  async function archiveOrder(id: string, source?: string) {
    if (!confirm('Archive/cancel this order?')) return;
    await api(`/console/api/v1/orders/${id}?source=${encodeURIComponent(source ?? 'shopify')}`, {
      method: 'DELETE',
    });
    await load();
  }

  async function archiveFarmer(id: string) {
    if (!confirm('Archive this farmer?')) return;
    await api(`/console/api/v1/farmers/${id}`, { method: 'DELETE' });
    await load();
  }

  async function archiveProduct(id: string) {
    if (!confirm('Archive this product?')) return;
    await api(`/console/api/v1/products/${id}`, { method: 'DELETE' });
    await load();
  }

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="commerce-hub">
      <HubTabs tabs={TABS} active={tab} onChange={setTab} />
      <FilterBar>
        <Input
          type="search"
          className="products-search"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </FilterBar>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {loading ? <Loading /> : null}

      {!loading && tab === 'orders' ? (
        <Panel title="Orders">
          <TableWrap>
            <DataTable>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Farmer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.length ? (
                  orders.map((o) => (
                    <tr key={String(o.id)}>
                      <td>{String(o.displayOrderId ?? o.id)}</td>
                      <td>
                        {String(o.farmerName ?? '—')}
                        <br />
                        <small className="muted">{String(o.phone ?? '')}</small>
                      </td>
                      <td>₹{String(o.totalAmount ?? 0)}</td>
                      <td>{String(o.status ?? '—')}</td>
                      <td>{String(o.paymentLabel ?? '—')}</td>
                      <td>
                        {canWrite ? (
                          <button
                            type="button"
                            className="text-xs text-red-600 hover:underline"
                            onClick={() => archiveOrder(String(o.id), String(o.source ?? 'shopify'))}
                          >
                            Archive
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState>No orders found.</EmptyState>
                    </td>
                  </tr>
                )}
              </tbody>
            </DataTable>
          </TableWrap>
        </Panel>
      ) : null}

      {!loading && tab === 'farmers' ? (
        <Panel title="Farmers">
          <TableWrap>
            <DataTable>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>District</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {farmers.map((f) => (
                  <tr key={String(f.id)}>
                    <td>{String(f.displayName ?? '—')}</td>
                    <td>{String(f.phone ?? '—')}</td>
                    <td>{String(f.district ?? '—')}</td>
                    <td>{String(f.status ?? '—')}</td>
                    <td>
                      {canWrite ? (
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline"
                          onClick={() => archiveFarmer(String(f.id))}
                        >
                          Archive
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </TableWrap>
        </Panel>
      ) : null}

      {!loading && tab === 'products' ? (
        <Panel title="Products">
          <TableWrap>
            <DataTable>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Status</th>
                  <th>Stock</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={String(p.id)}>
                    <td>{String(p.title ?? '—')}</td>
                    <td>{String(p.status ?? '—')}</td>
                    <td>{String(p.inventory ?? 0)}</td>
                    <td>
                      {canWrite ? (
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline"
                          onClick={() => archiveProduct(String(p.id))}
                        >
                          Archive
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </TableWrap>
        </Panel>
      ) : null}

      {!loading && tab === 'inventory' ? (
        <Panel title="Inventory">
          <TableWrap>
            <DataTable>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((r, i) => (
                  <tr key={i}>
                    <td>{String(r.title ?? '—')}</td>
                    <td>{String(r.batchNo ?? r.sku ?? '—')}</td>
                    <td>{String(r.stock ?? r.inventory ?? 0)}</td>
                    <td>{String(r.status ?? '—')}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </TableWrap>
        </Panel>
      ) : null}
    </div>
  );
}
