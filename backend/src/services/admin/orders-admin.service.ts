import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError } from '../../lib/errors.js';

export interface OrdersListQuery {
  page?: number;
  limit?: number;
  search?: string;
}

function mapCommerceOrder(row: Record<string, unknown>) {
  return {
    id: row.id,
    source: 'shopify' as const,
    shopifyOrderId: row.shopify_order_id,
    orderName: row.order_name,
    email: row.email,
    phone: row.phone,
    financialStatus: row.financial_status,
    fulfillmentStatus: row.fulfillment_status,
    paymentStatus: row.payment_status,
    totalAmount: row.total_amount,
    currency: row.currency,
    razorpayPaymentId: row.razorpay_payment_id,
    isCod: row.is_cod,
    createdAt: row.created_at,
  };
}

function mapCheckoutSession(row: Record<string, unknown>) {
  const customer = row.customer as Record<string, unknown> | null;
  return {
    id: row.id,
    source: 'razorpay_checkout' as const,
    shopifyOrderId: row.shopify_order_id,
    orderName: row.shopify_order_name,
    email: customer?.email,
    phone: customer?.phone,
    financialStatus: row.status === 'paid' ? 'paid' : row.status,
    totalAmount: (Number(row.amount_paise) || 0) / 100,
    currency: row.currency ?? 'INR',
    razorpayPaymentId: row.razorpay_payment_id,
    createdAt: row.created_at,
  };
}

export const ordersAdminService = {
  async list(query: OrdersListQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 25));

    const [commerce, checkouts] = await Promise.all([
      supabase
        .from('commerce_orders')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('checkout_sessions')
        .select('*')
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

    throwIfSupabaseError(commerce.error, 'Could not load orders');
    throwIfSupabaseError(checkouts.error, 'Could not load checkout orders');

    let orders = [
      ...(commerce.data ?? []).map(mapCommerceOrder),
      ...(checkouts.data ?? []).map(mapCheckoutSession),
    ].sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());

    if (query.search?.trim()) {
      const term = query.search.trim().toLowerCase();
      orders = orders.filter((o) => {
        const hay = `${o.orderName} ${o.email} ${o.phone} ${o.shopifyOrderId}`.toLowerCase();
        return hay.includes(term);
      });
    }

    const total = orders.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, pages);
    const start = (safePage - 1) * limit;

    return {
      orders: orders.slice(start, start + limit),
      pagination: { page: safePage, limit, total, pages },
    };
  },

  async get(id: string) {
    const { data, error } = await supabase.from('commerce_orders').select('*').eq('id', id).maybeSingle();
    throwIfSupabaseError(error, 'Could not load order');
    if (data) return mapCommerceOrder(data);

    const { data: session, error: sErr } = await supabase
      .from('checkout_sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwIfSupabaseError(sErr, 'Could not load order');
    if (session) return mapCheckoutSession(session);

    throw new NotFoundError('Order not found');
  },
};
