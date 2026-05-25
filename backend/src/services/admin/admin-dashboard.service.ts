import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { shopifyProductsService } from '../shopify/shopify.products.service.js';

function weekAgoIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

export const adminDashboardService = {
  async getOverview() {
    const weekAgo = weekAgoIso();

    const [
      farmersCount,
      farmersWeek,
      productCount,
      ordersCount,
      paidCheckouts,
      revenueResult,
      recentFarmers,
      recentOrders,
      recentCheckouts,
    ] = await Promise.all([
      supabase.from('farmers').select('*', { count: 'exact', head: true }),
      supabase
        .from('farmers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo),
      shopifyProductsService.count(),
      supabase.from('commerce_orders').select('*', { count: 'exact', head: true }),
      supabase
        .from('checkout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'paid'),
      supabase
        .from('checkout_sessions')
        .select('amount_paise')
        .eq('status', 'paid'),
      supabase
        .from('farmers')
        .select('id, email, first_name, last_name, name, phone, district, created_at, last_login_at')
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('commerce_orders')
        .select('id, order_name, email, phone, total_amount, currency, financial_status, created_at')
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('checkout_sessions')
        .select('id, shopify_order_name, amount_paise, currency, status, customer, created_at')
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(6),
    ]);

    throwIfSupabaseError(farmersCount.error, 'Could not load farmer stats');
    throwIfSupabaseError(farmersWeek.error, 'Could not load farmer stats');
    throwIfSupabaseError(ordersCount.error, 'Could not load order stats');
    throwIfSupabaseError(paidCheckouts.error, 'Could not load checkout stats');
    throwIfSupabaseError(revenueResult.error, 'Could not load revenue');
    throwIfSupabaseError(recentFarmers.error, 'Could not load recent farmers');
    throwIfSupabaseError(recentOrders.error, 'Could not load recent orders');
    throwIfSupabaseError(recentCheckouts.error, 'Could not load recent checkouts');

    const revenuePaise = (revenueResult.data ?? []).reduce(
      (sum, row) => sum + (Number(row.amount_paise) || 0),
      0
    );

    let lowStock: Array<{ id: string; title: string; inventory: number; imageUrl: string | null }> = [];
    try {
      const listed = await shopifyProductsService.list({ page: 1, limit: 100 });
      lowStock = listed.products
        .filter((p) => (p.inventory ?? 0) <= 10)
        .sort((a, b) => (a.inventory ?? 0) - (b.inventory ?? 0))
        .slice(0, 8)
        .map((p) => ({
          id: p.id,
          title: p.title,
          inventory: p.inventory ?? 0,
          imageUrl: p.imageUrl,
        }));
    } catch {
      lowStock = [];
    }

    return {
      kpis: {
        farmers: farmersCount.count ?? 0,
        farmersThisWeek: farmersWeek.count ?? 0,
        products: productCount,
        orders: ordersCount.count ?? 0,
        paidCheckouts: paidCheckouts.count ?? 0,
        revenueInr: revenuePaise / 100,
      },
      lowStock,
      recentFarmers: (recentFarmers.data ?? []).map((f) => ({
        id: f.id,
        name: [f.first_name, f.last_name].filter(Boolean).join(' ') || f.name || '—',
        email: f.email,
        phone: f.phone,
        district: f.district,
        createdAt: f.created_at,
        lastLoginAt: f.last_login_at,
      })),
      recentOrders: (recentOrders.data ?? []).map((o) => ({
        id: o.id,
        orderName: o.order_name,
        email: o.email,
        phone: o.phone,
        totalAmount: o.total_amount,
        currency: o.currency,
        financialStatus: o.financial_status,
        createdAt: o.created_at,
      })),
      recentCheckouts: (recentCheckouts.data ?? []).map((c) => {
        const customer = c.customer as { email?: string; firstName?: string; lastName?: string } | null;
        return {
          id: c.id,
          orderName: c.shopify_order_name,
          amountInr: (c.amount_paise ?? 0) / 100,
          email: customer?.email,
          customerName: customer
            ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim()
            : null,
          createdAt: c.created_at,
        };
      }),
      roadmap: {
        offers: false,
        combos: false,
        flashSales: false,
        aiAdvisory: false,
        whatsapp: false,
        analytics: false,
      },
    };
  },
};
