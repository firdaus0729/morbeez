import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';

export type OfferTab = 'all' | 'active' | 'upcoming' | 'expired';

export interface OfferListQuery {
  tab?: OfferTab;
}

export interface CreateOfferInput {
  name: string;
  offerType: 'percentage' | 'combo' | 'flat';
  discountLabel: string;
  minOrderAmount: number;
  startsAt: string;
  endsAt: string;
  description?: string;
}

export interface CreateCouponInput {
  code: string;
  discountLabel: string;
  minOrderAmount: number;
  usageLimit: number;
  validUntil: string;
}

type OfferRow = {
  id: string;
  name: string;
  offer_type: string;
  discount_label: string;
  min_order_amount: number;
  starts_at: string;
  ends_at: string;
  description: string | null;
};

type CouponRow = {
  id: string;
  code: string;
  discount_label: string;
  min_order_amount: number;
  usage_count: number;
  usage_limit: number;
  valid_until: string;
  active: boolean;
};

function resolveOfferStatus(startsAt: string, endsAt: string): 'active' | 'upcoming' | 'expired' {
  const now = Date.now();
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (now < start) return 'upcoming';
  if (now > end) return 'expired';
  return 'active';
}

function formatValidity(startsAt: string, endsAt: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  return `${fmt(startsAt)} – ${fmt(endsAt)}`;
}

function formatOfferType(type: string): string {
  const map: Record<string, string> = {
    percentage: 'Percentage',
    combo: 'Combo',
    flat: 'Flat',
  };
  return map[type] ?? type;
}

function mapOffer(row: OfferRow) {
  const status = resolveOfferStatus(row.starts_at, row.ends_at);
  return {
    id: row.id,
    name: row.name,
    type: formatOfferType(row.offer_type),
    offerType: row.offer_type,
    discount: row.discount_label,
    minOrder: Number(row.min_order_amount),
    validity: formatValidity(row.starts_at, row.ends_at),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status,
    description: row.description,
  };
}

function mapCoupon(row: CouponRow) {
  const expired = Date.now() > new Date(row.valid_until).getTime();
  return {
    id: row.id,
    code: row.code,
    discount: row.discount_label,
    minOrder: Number(row.min_order_amount),
    usage: row.usage_count,
    usageLimit: row.usage_limit,
    usageLabel: `${row.usage_count} / ${row.usage_limit}`,
    validTill: new Date(row.valid_until).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    validUntil: row.valid_until,
    status: expired || !row.active ? 'expired' : 'active',
  };
}

export const offersAdminService = {
  async listOffers(query: OfferListQuery) {
    const { data, error } = await supabase
      .from('commerce_offers')
      .select('*')
      .order('starts_at', { ascending: false });
    throwIfSupabaseError(error, 'Could not load offers');

    const all = (data ?? []).map((r) => mapOffer(r as OfferRow));
    const tabCounts = {
      all: all.length,
      active: all.filter((o) => o.status === 'active').length,
      upcoming: all.filter((o) => o.status === 'upcoming').length,
      expired: all.filter((o) => o.status === 'expired').length,
    };

    const tab = query.tab ?? 'all';
    const offers =
      tab === 'all' ? all : all.filter((o) => o.status === tab);

    return { offers, tabCounts };
  },

  async getOffer(id: string) {
    const { data, error } = await supabase.from('commerce_offers').select('*').eq('id', id).maybeSingle();
    throwIfSupabaseError(error, 'Could not load offer');
    if (!data) throw new NotFoundError('Offer not found');
    return mapOffer(data as OfferRow);
  },

  async createOffer(input: CreateOfferInput) {
    if (new Date(input.endsAt) <= new Date(input.startsAt)) {
      throw new ValidationError('End date must be after start date');
    }
    const { data, error } = await supabase
      .from('commerce_offers')
      .insert({
        name: input.name.trim(),
        offer_type: input.offerType,
        discount_label: input.discountLabel.trim(),
        min_order_amount: input.minOrderAmount,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        description: input.description?.trim() || null,
      })
      .select('*')
      .single();
    throwIfSupabaseError(error, 'Could not create offer');
    return mapOffer(data as OfferRow);
  },

  async listCoupons() {
    const { data, error } = await supabase
      .from('commerce_coupons')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });
    throwIfSupabaseError(error, 'Could not load coupons');

    const coupons = (data ?? []).map((r) => mapCoupon(r as CouponRow));
    const active = coupons.filter((c) => c.status === 'active');
    return { coupons: active, total: coupons.length };
  },

  async getCoupon(id: string) {
    const { data, error } = await supabase.from('commerce_coupons').select('*').eq('id', id).maybeSingle();
    throwIfSupabaseError(error, 'Could not load coupon');
    if (!data) throw new NotFoundError('Coupon not found');
    return mapCoupon(data as CouponRow);
  },

  async createCoupon(input: CreateCouponInput) {
    const code = input.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,24}$/.test(code)) {
      throw new ValidationError('Coupon code must be 3–24 letters, numbers, _ or -');
    }
    const { data, error } = await supabase
      .from('commerce_coupons')
      .insert({
        code,
        discount_label: input.discountLabel.trim(),
        min_order_amount: input.minOrderAmount,
        usage_limit: input.usageLimit,
        valid_until: input.validUntil,
      })
      .select('*')
      .single();
    throwIfSupabaseError(error, 'Could not create coupon');
    return mapCoupon(data as CouponRow);
  },
};
