import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { shopifyProductsService } from '../shopify/shopify.products.service.js';

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function pctChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function lastNDaysLabels(n: number): string[] {
  const labels: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(
      d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    );
  }
  return labels;
}

export const adminDashboardService = {
  async getOverview() {
    const weekAgo = daysAgoIso(7);
    const twoWeeksAgo = daysAgoIso(14);

    const [
      farmersCount,
      farmersWeek,
      farmersPrevWeek,
      productCount,
      ordersCount,
      paidCheckouts,
      revenueResult,
      revenueWeek,
      revenuePrevWeek,
      ordersWeek,
      ordersPrevWeek,
      pendingCheckouts,
      aiSessionsCount,
      aiSessionsWeek,
      recentFarmers,
      recentOrders,
      recentCheckouts,
      paidSessionsForChart,
      allProductsList,
    ] = await Promise.all([
      supabase.from('farmers').select('*', { count: 'exact', head: true }),
      supabase
        .from('farmers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo),
      supabase
        .from('farmers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twoWeeksAgo)
        .lt('created_at', weekAgo),
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
        .from('checkout_sessions')
        .select('amount_paise, created_at')
        .eq('status', 'paid')
        .gte('created_at', weekAgo),
      supabase
        .from('checkout_sessions')
        .select('amount_paise, created_at')
        .eq('status', 'paid')
        .gte('created_at', twoWeeksAgo)
        .lt('created_at', weekAgo),
      supabase
        .from('checkout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'paid')
        .gte('created_at', weekAgo),
      supabase
        .from('checkout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'paid')
        .gte('created_at', twoWeeksAgo)
        .lt('created_at', weekAgo),
      supabase
        .from('checkout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase.from('ai_advisory_sessions').select('*', { count: 'exact', head: true }),
      supabase
        .from('ai_advisory_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo),
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
      supabase
        .from('checkout_sessions')
        .select('amount_paise, created_at, line_items, status')
        .gte('created_at', daysAgoIso(7)),
      shopifyProductsService.list({ page: 1, limit: 100 }).catch(() => ({ products: [] })),
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
    const revenueWeekPaise = (revenueWeek.data ?? []).reduce(
      (sum, row) => sum + (Number(row.amount_paise) || 0),
      0
    );
    const revenuePrevWeekPaise = (revenuePrevWeek.data ?? []).reduce(
      (sum, row) => sum + (Number(row.amount_paise) || 0),
      0
    );

    const totalOrders = (ordersCount.count ?? 0) + (paidCheckouts.count ?? 0);
    const ordersThisWeek = ordersWeek.count ?? 0;
    const ordersPrevWeekCount = ordersPrevWeek.count ?? 0;

    const farmersTotal = farmersCount.count ?? 0;
    const conversionRate =
      farmersTotal > 0 ? Math.round((totalOrders / farmersTotal) * 10000) / 100 : 0;
    const avgOrderValue = totalOrders > 0 ? revenuePaise / 100 / totalOrders : 0;

    const chartDays = 7;
    const dayKeys = Array.from({ length: chartDays }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (chartDays - 1 - i));
      return d.toISOString().slice(0, 10);
    });
    const salesByDay = dayKeys.map(() => 0);
    for (const row of paidSessionsForChart.data ?? []) {
      if (row.status !== 'paid') continue;
      const key = String(row.created_at).slice(0, 10);
      const idx = dayKeys.indexOf(key);
      if (idx >= 0) salesByDay[idx] += (Number(row.amount_paise) || 0) / 100;
    }

    const productRevenue = new Map<string, { title: string; revenue: number; imageUrl: string | null }>();
    for (const row of paidSessionsForChart.data ?? []) {
      if (row.status !== 'paid') continue;
      const items = row.line_items as Array<{ title?: string; price?: number; quantity?: number }>;
      for (const li of items ?? []) {
        const title = li.title || 'Product';
        const rev = ((Number(li.price) || 0) * (li.quantity ?? 1)) / 100;
        const cur = productRevenue.get(title) ?? { title, revenue: 0, imageUrl: null };
        cur.revenue += rev;
        productRevenue.set(title, cur);
      }
    }

    const products = 'products' in allProductsList ? allProductsList.products : [];
    for (const p of products) {
      const t = p.title as string;
      if (!productRevenue.has(t)) {
        productRevenue.set(t, { title: t, revenue: 0, imageUrl: p.imageUrl ?? null });
      } else if (p.imageUrl) {
        productRevenue.get(t)!.imageUrl = p.imageUrl;
      }
    }

    let topProducts = [...productRevenue.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((p) => ({
        title: p.title,
        revenue: p.revenue,
        imageUrl: p.imageUrl,
      }));

    if (!topProducts.length && products.length) {
      topProducts = products.slice(0, 5).map((p) => ({
        title: p.title as string,
        revenue: 0,
        imageUrl: (p.imageUrl as string | null) ?? null,
      }));
    }

    let lowStock: Array<{ id: string; title: string; inventory: number; imageUrl: string | null }> = [];
    let outOfStock = 0;
    for (const p of products) {
      const inv = p.inventory ?? 0;
      if (inv === 0) outOfStock++;
      if (inv > 0 && inv <= 10) {
        lowStock.push({
          id: p.id,
          title: p.title,
          inventory: inv,
          imageUrl: p.imageUrl,
        });
      }
    }
    lowStock.sort((a, b) => a.inventory - b.inventory);

    const compareDate = new Date();
    compareDate.setDate(compareDate.getDate() - 1);
    const compareLabel = compareDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return {
      kpis: {
        farmers: farmersTotal,
        farmersThisWeek: farmersWeek.count ?? 0,
        farmersTrend: pctChange(farmersWeek.count ?? 0, farmersPrevWeek.count ?? 0),
        products: productCount,
        orders: totalOrders,
        ordersTrend: pctChange(ordersThisWeek, ordersPrevWeekCount),
        paidCheckouts: paidCheckouts.count ?? 0,
        revenueInr: revenuePaise / 100,
        revenueTrend: pctChange(revenueWeekPaise, revenuePrevWeekPaise),
        conversionRate,
        conversionTrend: pctChange(ordersThisWeek, ordersPrevWeekCount),
        avgOrderValue,
        avgOrderTrend: pctChange(revenueWeekPaise / 100, revenuePrevWeekPaise / 100),
        aiDiagnoses: aiSessionsCount.error ? 0 : aiSessionsCount.count ?? 0,
        aiDiagnosesWeek: aiSessionsWeek.error ? 0 : aiSessionsWeek.count ?? 0,
        aiTrend: pctChange(
          aiSessionsWeek.error ? 0 : aiSessionsWeek.count ?? 0,
          0
        ),
        compareLabel,
      },
      alerts: {
        lowStock: lowStock.length,
        outOfStock,
        expiringSoon: 0,
        pendingOrders: pendingCheckouts.count ?? 0,
      },
      salesChart: {
        labels: lastNDaysLabels(chartDays),
        values: salesByDay,
      },
      topProducts,
      lowStock: lowStock.slice(0, 8),
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
        offers: true,
        combos: true,
        flashSales: true,
        aiAdvisory: true,
        whatsapp: false,
        analytics: false,
      },
    };
  },
};
