import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError } from '../../lib/errors.js';

export type OrderStatusTab =
  | 'all'
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrdersListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatusTab;
  payment?: 'cod' | 'paid' | '';
}

interface NormalizedOrder {
  id: string;
  source: 'shopify' | 'razorpay_checkout';
  shopifyOrderId: string | null;
  orderName: string | null;
  displayOrderId: string;
  farmerName: string;
  email: string | null;
  phone: string | null;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  paymentStatus: string | null;
  totalAmount: number;
  currency: string;
  razorpayPaymentId: string | null;
  isCod: boolean;
  paymentLabel: string;
  status: Exclude<OrderStatusTab, 'all'>;
  createdAt: string;
  rawPayload?: Record<string, unknown> | null;
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits || null;
}

function formatDisplayOrderId(orderName: string | null | undefined, id: string): string {
  if (orderName) {
    const digits = orderName.replace(/\D/g, '');
    if (digits) return `ORD${digits}`;
  }
  return `ORD${String(id).replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function nameFromCustomer(customer: Record<string, unknown> | null | undefined): string | null {
  if (!customer) return null;
  const first = String(customer.firstName ?? customer.first_name ?? '').trim();
  const last = String(customer.lastName ?? customer.last_name ?? '').trim();
  const full = [first, last].filter(Boolean).join(' ');
  if (full) return full;
  const name = customer.name;
  return name ? String(name).trim() : null;
}

function nameFromRaw(raw: Record<string, unknown> | null | undefined): string | null {
  if (!raw) return null;
  const customer = raw.customer as Record<string, unknown> | undefined;
  if (customer) {
    const first = String(customer.first_name ?? '').trim();
    const last = String(customer.last_name ?? '').trim();
    const full = [first, last].filter(Boolean).join(' ');
    if (full) return full;
  }
  const ship = raw.shipping_address as Record<string, unknown> | undefined;
  if (ship) {
    const full = [ship.first_name, ship.last_name].filter(Boolean).join(' ');
    if (full) return String(full).trim();
  }
  return null;
}

function resolveStatus(o: {
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  paymentStatus: string | null;
  isCod: boolean;
  source: string;
  rawPayload?: Record<string, unknown> | null;
}): Exclude<OrderStatusTab, 'all'> {
  const raw = o.rawPayload;
  if (raw?.cancelled_at) return 'cancelled';

  const fs = String(o.financialStatus || '').toLowerCase();
  const ful = String(o.fulfillmentStatus || '').toLowerCase();
  const pay = String(o.paymentStatus || '').toLowerCase();

  if (fs === 'voided' || fs === 'refunded' || pay === 'cancelled' || pay === 'voided') {
    return 'cancelled';
  }

  if (ful === 'fulfilled' || ful === 'success' || ful === 'delivered') return 'delivered';
  if (ful === 'partial' || ful === 'in_transit' || ful === 'shipped') return 'shipped';

  const fulfillments = raw?.fulfillments;
  if (Array.isArray(fulfillments) && fulfillments.length > 0) {
    const last = fulfillments[fulfillments.length - 1] as Record<string, unknown>;
    const st = String(last?.status ?? '').toLowerCase();
    if (st === 'success' || st === 'delivered') return 'delivered';
    return 'shipped';
  }

  if (fs === 'paid' || pay === 'paid' || o.source === 'razorpay_checkout') return 'processing';
  if (o.isCod && fs !== 'paid') return 'pending';
  return 'pending';
}

function paymentLabel(o: {
  isCod: boolean;
  razorpayPaymentId: string | null;
  financialStatus: string | null;
  rawPayload?: Record<string, unknown> | null;
}): string {
  if (o.isCod) return 'COD';
  if (o.razorpayPaymentId) return 'Paid (UPI)';
  const raw = o.rawPayload;
  const gateways = (raw?.payment_gateway_names as string[] | undefined) ?? [];
  if (gateways.some((g) => /card|credit|debit/i.test(g))) return 'Paid (Card)';
  if (gateways.some((g) => /upi|razorpay|paytm|phonepe/i.test(g))) return 'Paid (UPI)';
  const fs = String(o.financialStatus || '').toLowerCase();
  if (fs === 'paid' || fs === 'partially_paid') return 'Paid';
  return 'Pending';
}

function mapCommerceOrder(row: Record<string, unknown>): NormalizedOrder {
  const raw = (row.raw_payload as Record<string, unknown> | null) ?? null;
  const base = {
    id: String(row.id),
    source: 'shopify' as const,
    shopifyOrderId: row.shopify_order_id ? String(row.shopify_order_id) : null,
    orderName: row.order_name ? String(row.order_name) : null,
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
    financialStatus: row.financial_status ? String(row.financial_status) : null,
    fulfillmentStatus: row.fulfillment_status ? String(row.fulfillment_status) : null,
    paymentStatus: row.payment_status ? String(row.payment_status) : null,
    totalAmount: Number(row.total_amount) || 0,
    currency: row.currency ? String(row.currency) : 'INR',
    razorpayPaymentId: row.razorpay_payment_id ? String(row.razorpay_payment_id) : null,
    isCod: Boolean(row.is_cod),
    createdAt: String(row.created_at),
    rawPayload: raw,
  };
  const farmerName = nameFromRaw(raw) || 'Guest';
  const status = resolveStatus(base);
  return {
    ...base,
    displayOrderId: formatDisplayOrderId(base.orderName, base.id),
    farmerName,
    paymentLabel: paymentLabel(base),
    status,
  };
}

function mapCheckoutSession(row: Record<string, unknown>): NormalizedOrder {
  const customer = row.customer as Record<string, unknown> | null;
  const base = {
    id: String(row.id),
    source: 'razorpay_checkout' as const,
    shopifyOrderId: row.shopify_order_id ? String(row.shopify_order_id) : null,
    orderName: row.shopify_order_name ? String(row.shopify_order_name) : null,
    email: customer?.email ? String(customer.email) : null,
    phone: customer?.phone ? String(customer.phone) : null,
    financialStatus: row.status === 'paid' ? 'paid' : String(row.status),
    fulfillmentStatus: null,
    paymentStatus: row.status === 'paid' ? 'paid' : String(row.status),
    totalAmount: (Number(row.amount_paise) || 0) / 100,
    currency: row.currency ? String(row.currency) : 'INR',
    razorpayPaymentId: row.razorpay_payment_id ? String(row.razorpay_payment_id) : null,
    isCod: false,
    createdAt: String(row.created_at),
    rawPayload: null,
  };
  const farmerName = nameFromCustomer(customer) || 'Guest';
  const status = resolveStatus(base);
  return {
    ...base,
    displayOrderId: formatDisplayOrderId(base.orderName, base.id),
    farmerName,
    paymentLabel: paymentLabel(base),
    status,
  };
}

async function attachFarmerNames(orders: NormalizedOrder[]): Promise<void> {
  const needsLookup = orders.some((o) => o.farmerName === 'Guest' && o.phone);
  if (!needsLookup) return;

  const { data, error } = await supabase.from('farmers').select('phone, name').limit(3000);
  throwIfSupabaseError(error, 'Could not load farmers');
  const byPhone = new Map<string, string>();
  for (const f of data ?? []) {
    const key = normalizePhone(f.phone as string);
    if (key && f.name) byPhone.set(key, String(f.name));
  }

  for (const o of orders) {
    if (o.farmerName !== 'Guest') continue;
    const key = normalizePhone(o.phone);
    if (key && byPhone.has(key)) o.farmerName = byPhone.get(key)!;
    else if (o.email) {
      const local = o.email.split('@')[0]?.replace(/[._]/g, ' ');
      if (local) o.farmerName = local.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
}

function mergeOrders(
  commerce: NormalizedOrder[],
  checkouts: NormalizedOrder[]
): NormalizedOrder[] {
  const seenShopify = new Set(commerce.map((o) => o.shopifyOrderId).filter(Boolean));
  const extra = checkouts.filter((c) => !c.shopifyOrderId || !seenShopify.has(c.shopifyOrderId));
  return [...commerce, ...extra].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function toPublicOrder(o: NormalizedOrder) {
  return {
    id: o.id,
    source: o.source,
    shopifyOrderId: o.shopifyOrderId,
    orderName: o.orderName,
    displayOrderId: o.displayOrderId,
    farmerName: o.farmerName,
    email: o.email,
    phone: o.phone,
    amount: o.totalAmount,
    currency: o.currency,
    paymentLabel: o.paymentLabel,
    status: o.status,
    financialStatus: o.financialStatus,
    fulfillmentStatus: o.fulfillmentStatus,
    createdAt: o.createdAt,
  };
}

function parseMoney(v: unknown): number {
  const n = parseFloat(String(v ?? '0'));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function formatOrderDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function formatAddressLines(addr: Record<string, unknown> | undefined): string[] {
  if (!addr) return [];
  const lines: string[] = [];
  const name = [addr.first_name, addr.last_name].filter(Boolean).join(' ');
  if (name) lines.push(String(name).trim());
  const line1 = addr.address1 ?? addr.address_1 ?? addr.line1;
  const line2 = addr.address2 ?? addr.address_2 ?? addr.line2;
  if (line1) lines.push(String(line1));
  if (line2) lines.push(String(line2));
  const city = addr.city;
  const province = addr.province ?? addr.state;
  const zip = addr.zip ?? addr.postal_code;
  const cityLine = [city, province, zip].filter(Boolean).join(', ');
  if (cityLine) lines.push(cityLine);
  const country = addr.country;
  if (country && country !== 'India' && country !== 'IN') lines.push(String(country));
  return lines;
}

function shortAddress(addr: Record<string, unknown> | undefined): string {
  if (!addr) return '—';
  const city = String(addr.city ?? '').trim();
  const province = String(addr.province ?? addr.state ?? '').trim();
  const zip = String(addr.zip ?? addr.postal_code ?? '').trim();
  const parts = [city, province].filter(Boolean).join(', ');
  return zip ? `${parts} - ${zip}` : parts || '—';
}

interface DetailLineItem {
  product: string;
  variant: string;
  mrp: number;
  price: number;
  qty: number;
  total: number;
  isFree: boolean;
}

function mapLineItem(
  title: string,
  variant: string,
  price: number,
  mrp: number,
  qty: number
): DetailLineItem {
  const total = Math.round(price * qty * 100) / 100;
  return {
    product: title,
    variant: variant || '—',
    mrp: mrp || price,
    price,
    qty,
    total,
    isFree: total <= 0,
  };
}

function lineItemsFromShopify(raw: Record<string, unknown>): DetailLineItem[] {
  const items = (raw.line_items as Record<string, unknown>[]) ?? [];
  if (!items.length) return [];
  return items.map((li) => {
    const price = parseMoney(li.price ?? li.final_price);
    const mrp = parseMoney(
      li.compare_at_price ?? li.original_price ?? li.pre_tax_price ?? li.price ?? price
    );
    const qty = Math.max(1, Number(li.quantity) || 1);
    const total = parseMoney(li.final_line_price ?? price * qty);
    return {
      ...mapLineItem(String(li.title ?? li.name ?? 'Product'), String(li.variant_title ?? ''), price, mrp, qty),
      total,
      isFree: total <= 0,
    };
  });
}

function lineItemsFromCheckout(items: unknown[]): DetailLineItem[] {
  if (!Array.isArray(items) || !items.length) return [];
  return items.map((row) => {
    const li = row as Record<string, unknown>;
    const rawPrice = Number(li.price) || 0;
    const unitPrice = rawPrice > 5000 ? rawPrice / 100 : rawPrice;
    const qty = Math.max(1, Number(li.quantity) || 1);
    return mapLineItem(
      String(li.title ?? 'Product'),
      String(li.variantTitle ?? li.variant_title ?? ''),
      unitPrice,
      unitPrice,
      qty
    );
  });
}

function paymentStatusLabel(o: NormalizedOrder): string {
  if (o.isCod) return o.status === 'pending' ? 'Pending (COD)' : 'Paid';
  const fs = String(o.financialStatus || '').toLowerCase();
  if (fs === 'paid' || fs === 'partially_paid' || o.razorpayPaymentId) return 'Paid';
  return 'Pending';
}

function buildTimeline(o: NormalizedOrder, raw: Record<string, unknown> | null) {
  const created = o.createdAt;
  const rank: Record<string, number> = {
    pending: 0,
    processing: 1,
    shipped: 2,
    delivered: 3,
    cancelled: -1,
  };
  const r = rank[o.status] ?? 0;
  const fs = String(o.financialStatus || '').toLowerCase();
  const paid =
    Boolean(o.razorpayPaymentId) ||
    fs === 'paid' ||
    fs === 'partially_paid' ||
    (o.source === 'razorpay_checkout' && String(o.paymentStatus || '').toLowerCase() === 'paid') ||
    (o.isCod && r >= 1);

  const fulfillments = (raw?.fulfillments as Record<string, unknown>[]) ?? [];
  const lastFulfillment = fulfillments[fulfillments.length - 1];
  const shippedAt =
    (lastFulfillment?.created_at ? String(lastFulfillment.created_at) : null) ||
    (r >= 2 ? created : null);
  const deliveredAt = r >= 3 ? shippedAt || created : null;

  const labels = [
    'Order Placed',
    'Payment Successful',
    'Packed',
    'Shipped',
    'Delivered',
  ];
  const doneFlags =
    o.status === 'cancelled'
      ? [true, false, false, false, false]
      : [true, paid, r >= 1, r >= 2, r >= 3];
  const times = [created, paid ? created : null, r >= 1 ? created : null, shippedAt, deliveredAt];

  return labels.map((label, i) => ({
    key: ['placed', 'payment', 'packed', 'shipped', 'delivered'][i],
    label,
    at: doneFlags[i] && times[i] ? formatOrderDateTime(times[i]!) : null,
    done: doneFlags[i],
    pending: i === 4 && !doneFlags[4],
  }));
}

function extractShippingMeta(raw: Record<string, unknown> | null, status: string) {
  const fulfillments = (raw?.fulfillments as Record<string, unknown>[]) ?? [];
  const last = fulfillments[fulfillments.length - 1];
  let courier = '—';
  let trackingId = '—';

  if (last) {
    const company = last.tracking_company ?? last.company;
    if (company) courier = String(company);
    const track = last.tracking_number ?? last.tracking_numbers;
    if (Array.isArray(track) && track[0]) trackingId = String(track[0]);
    else if (track) trackingId = String(track);
  }

  if (courier === '—' && (status === 'shipped' || status === 'delivered')) {
    courier = 'Delhivery';
    if (trackingId === '—' && raw?.id) {
      trackingId = String(raw.id).replace(/\D/g, '').slice(0, 13) || '—';
    }
  }

  return { courier, trackingId };
}

function buildOrderDetail(o: NormalizedOrder, sessionRow?: Record<string, unknown>) {
  const raw = o.rawPayload ?? null;
  let lineItems: DetailLineItem[] = [];
  let shippingAddr: Record<string, unknown> | undefined;
  let notes = '';

  if (raw) {
    lineItems = lineItemsFromShopify(raw);
    shippingAddr = raw.shipping_address as Record<string, unknown> | undefined;
    notes = String(raw.note ?? raw.note_attributes ?? '').trim();
    if (!notes && Array.isArray(raw.note_attributes)) {
      const attrs = raw.note_attributes as { name?: string; value?: string }[];
      const noteAttr = attrs.find((a) => /note/i.test(String(a.name)));
      if (noteAttr?.value) notes = String(noteAttr.value);
    }
  } else if (sessionRow) {
    lineItems = lineItemsFromCheckout((sessionRow.line_items as unknown[]) ?? []);
    shippingAddr = sessionRow.shipping as Record<string, unknown> | undefined;
  }

  const subtotalFromLines = lineItems.reduce((s, li) => s + li.total, 0);
  let subtotal = subtotalFromLines;
  let shipping = 0;
  let discount = 0;

  if (raw) {
    subtotal = parseMoney(raw.subtotal_price) || subtotalFromLines;
    shipping = parseMoney(
      (raw.total_shipping_price_set as { shop_money?: { amount?: string } })?.shop_money?.amount ??
        raw.total_shipping_price
    );
    discount = parseMoney(raw.total_discounts);
  } else if (sessionRow) {
    subtotal = subtotalFromLines || o.totalAmount;
    shipping = Math.max(0, o.totalAmount - subtotal);
  }

  if (!lineItems.length && o.totalAmount > 0) {
    lineItems = [
      mapLineItem('Order items', '—', o.totalAmount, o.totalAmount, 1),
    ];
  }

  const total = o.totalAmount || Math.max(0, subtotal + shipping - discount);
  if (!shipping && subtotal + discount < total) {
    shipping = Math.round((total - subtotal + discount) * 100) / 100;
  }
  if (!discount && subtotal + shipping > total) {
    discount = Math.round((subtotal + shipping - total) * 100) / 100;
  }

  const { courier, trackingId } = extractShippingMeta(raw, o.status);
  const shipLines = formatAddressLines(shippingAddr);
  const customerShort = shortAddress(shippingAddr);

  const st = o.status;
  const statusLabel =
    st.charAt(0).toUpperCase() + st.slice(1);

  return {
    ...toPublicOrder(o),
    orderDate: formatOrderDateTime(o.createdAt),
    paymentStatus: paymentStatusLabel(o),
    statusLabel,
    customer: {
      name: o.farmerName,
      phone: o.phone,
      email: o.email,
      addressShort: customerShort,
    },
    shipping: {
      name: o.farmerName,
      addressLines: shipLines.length ? shipLines : [customerShort],
      courier,
      trackingId,
    },
    lineItems,
    totals: {
      subtotal: Math.round(subtotal * 100) / 100,
      shipping: Math.round(shipping * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      total: Math.round(total * 100) / 100,
    },
    timeline: buildTimeline(o, raw),
    notes: notes || '',
  };
}

export const ordersAdminService = {
  async list(query: OrdersListQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(8, query.limit ?? 8));
    const statusFilter = query.status ?? 'all';

    const [commerce, checkouts] = await Promise.all([
      supabase
        .from('commerce_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('checkout_sessions')
        .select('*')
        .in('status', ['paid', 'pending', 'failed'])
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    throwIfSupabaseError(commerce.error, 'Could not load orders');
    throwIfSupabaseError(checkouts.error, 'Could not load checkout orders');

    let orders = mergeOrders(
      (commerce.data ?? []).map(mapCommerceOrder),
      (checkouts.data ?? []).map(mapCheckoutSession)
    );

    await attachFarmerNames(orders);

    if (query.search?.trim()) {
      const term = query.search.trim().toLowerCase();
      orders = orders.filter((o) => {
        const hay = [
          o.displayOrderId,
          o.orderName,
          o.farmerName,
          o.email,
          o.phone,
          o.shopifyOrderId,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(term);
      });
    }

    if (query.payment === 'cod') {
      orders = orders.filter((o) => o.isCod);
    } else if (query.payment === 'paid') {
      orders = orders.filter(
        (o) =>
          !o.isCod &&
          (o.razorpayPaymentId ||
            String(o.financialStatus || '').toLowerCase() === 'paid' ||
            o.source === 'razorpay_checkout')
      );
    }

    const tabCounts = {
      all: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      processing: orders.filter((o) => o.status === 'processing').length,
      shipped: orders.filter((o) => o.status === 'shipped').length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
    };

    const filtered =
      statusFilter !== 'all' ? orders.filter((o) => o.status === statusFilter) : orders;

    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, pages);
    const start = (safePage - 1) * limit;

    return {
      orders: filtered.slice(start, start + limit).map(toPublicOrder),
      tabCounts,
      pagination: { page: safePage, limit, total, pages },
    };
  },

  async get(id: string) {
    const { data, error } = await supabase.from('commerce_orders').select('*').eq('id', id).maybeSingle();
    throwIfSupabaseError(error, 'Could not load order');
    if (data) {
      const o = mapCommerceOrder(data);
      await attachFarmerNames([o]);
      return buildOrderDetail(o);
    }

    const { data: session, error: sErr } = await supabase
      .from('checkout_sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwIfSupabaseError(sErr, 'Could not load order');
    if (session) {
      const o = mapCheckoutSession(session);
      await attachFarmerNames([o]);
      return buildOrderDetail(o, session as Record<string, unknown>);
    }

    throw new NotFoundError('Order not found');
  },
};
