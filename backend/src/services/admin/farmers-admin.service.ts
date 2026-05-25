import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { farmerService } from '../farmer/farmer.service.js';
import { isValidIndianPhone } from '../../lib/phone.js';

export interface FarmerListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  state?: string;
}

const ACTIVE_DAYS = 90;
const NEW_FARMER_DAYS = 30;

function normalizePhoneDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits || null;
}

function displayName(row: Record<string, unknown>): string {
  const first = String(row.first_name ?? '').trim();
  const last = String(row.last_name ?? '').trim();
  const combined = [first, last].filter(Boolean).join(' ');
  if (combined) return combined;
  const name = row.name ? String(row.name).trim() : '';
  return name || 'Farmer';
}

function formatCropLabel(raw: string): string {
  return raw
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function avatarHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

function mapFarmerBase(row: Record<string, unknown>) {
  const name = displayName(row);
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    firstName: row.first_name,
    lastName: row.last_name,
    name: row.name,
    displayName: name,
    initials: name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'F',
    avatarHue: avatarHue(name),
    district: row.district,
    state: row.state,
    source: row.source,
    newsletterSubscribed: row.newsletter_subscribed,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isActiveFarmer(
  row: Record<string, unknown>,
  lastOrderAt: string | null
): boolean {
  const now = Date.now();
  const activeMs = ACTIVE_DAYS * 86400000;
  const newMs = NEW_FARMER_DAYS * 86400000;

  if (row.last_login_at) {
    const login = new Date(String(row.last_login_at)).getTime();
    if (!Number.isNaN(login) && now - login <= activeMs) return true;
  }
  if (lastOrderAt) {
    const order = new Date(lastOrderAt).getTime();
    if (!Number.isNaN(order) && now - order <= activeMs) return true;
  }
  if (!row.last_login_at && row.created_at) {
    const created = new Date(String(row.created_at)).getTime();
    if (!Number.isNaN(created) && now - created <= newMs) return true;
  }
  return false;
}

async function loadCropsByFarmerIds(ids: string[]) {
  const map = new Map<string, string[]>();
  if (!ids.length) return map;

  const { data, error } = await supabase
    .from('farmer_crops')
    .select('farmer_id, crop_type, is_primary')
    .in('farmer_id', ids)
    .order('is_primary', { ascending: false });

  throwIfSupabaseError(error, 'Could not load farmer crops');

  for (const row of data ?? []) {
    const fid = String(row.farmer_id);
    const list = map.get(fid) ?? [];
    list.push(formatCropLabel(String(row.crop_type)));
    map.set(fid, list);
  }
  return map;
}

async function loadOrderMetaByPhones(phones: (string | null | undefined)[]) {
  const wanted = new Set(
    phones.map(normalizePhoneDigits).filter((p): p is string => Boolean(p))
  );
  const lastOrder = new Map<string, string>();
  const orderCount = new Map<string, number>();

  if (!wanted.size) {
    return { lastOrder, orderCount, repeatBuyerPhones: new Set<string>() };
  }

  const { data, error } = await supabase
    .from('commerce_orders')
    .select('phone, created_at')
    .not('phone', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10000);

  throwIfSupabaseError(error, 'Could not load order history');

  for (const row of data ?? []) {
    const key = normalizePhoneDigits(String(row.phone));
    if (!key || !wanted.has(key)) continue;
    const created = String(row.created_at);
    orderCount.set(key, (orderCount.get(key) ?? 0) + 1);
    if (!lastOrder.has(key)) lastOrder.set(key, created);
  }

  const repeatBuyerPhones = new Set<string>();
  for (const [phone, count] of orderCount) {
    if (count >= 2) repeatBuyerPhones.add(phone);
  }

  return { lastOrder, orderCount, repeatBuyerPhones };
}

function enrichRow(
  row: Record<string, unknown>,
  crops: string[],
  lastOrderAt: string | null,
  orderCount: number
) {
  const base = mapFarmerBase(row);
  const active = isActiveFarmer(row, lastOrderAt);
  return {
    ...base,
    cropsLabel: crops.length ? crops.join(', ') : '—',
    lastOrderAt,
    orderCount,
    status: active ? ('active' as const) : ('inactive' as const),
    isRepeatBuyer: orderCount >= 2,
  };
}

export const farmersAdminService = {
  async getStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const activeCutoff = new Date(now.getTime() - ACTIVE_DAYS * 86400000).toISOString();
    const newCutoff = new Date(now.getTime() - NEW_FARMER_DAYS * 86400000).toISOString();

    const [totalRes, newRes, activeRes, ordersRes] = await Promise.all([
      supabase.from('farmers').select('id', { count: 'exact', head: true }),
      supabase
        .from('farmers')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', monthStart),
      supabase
        .from('farmers')
        .select('id', { count: 'exact', head: true })
        .or(`last_login_at.gte.${activeCutoff},created_at.gte.${newCutoff}`),
      supabase.from('commerce_orders').select('phone').not('phone', 'is', null).limit(10000),
    ]);

    throwIfSupabaseError(totalRes.error, 'Could not load farmer stats');
    throwIfSupabaseError(newRes.error, 'Could not load farmer stats');
    throwIfSupabaseError(activeRes.error, 'Could not load farmer stats');
    throwIfSupabaseError(ordersRes.error, 'Could not load order stats');

    const phoneCounts = new Map<string, number>();
    for (const row of ordersRes.data ?? []) {
      const key = normalizePhoneDigits(String(row.phone));
      if (!key) continue;
      phoneCounts.set(key, (phoneCounts.get(key) ?? 0) + 1);
    }
    let repeatBuyers = 0;
    for (const count of phoneCounts.values()) {
      if (count >= 2) repeatBuyers += 1;
    }

    const { data: farmerPhones } = await supabase.from('farmers').select('phone').not('phone', 'is', null);
    const farmerPhoneSet = new Set(
      (farmerPhones ?? [])
        .map((r) => normalizePhoneDigits(String(r.phone)))
        .filter((p): p is string => Boolean(p))
    );
    let repeatBuyersRegistered = 0;
    for (const [phone, count] of phoneCounts) {
      if (count >= 2 && farmerPhoneSet.has(phone)) repeatBuyersRegistered += 1;
    }

    return {
      total: totalRes.count ?? 0,
      active: activeRes.count ?? 0,
      newThisMonth: newRes.count ?? 0,
      repeatBuyers: repeatBuyersRegistered || repeatBuyers,
    };
  },

  async list(query: FarmerListQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 8));
    const status = query.status ?? 'all';
    const stateFilter = query.state?.trim();

    const stats = await this.getStats();

    let builder = supabase.from('farmers').select('*', { count: 'exact' }).order('created_at', {
      ascending: false,
    });

    if (query.search?.trim()) {
      const term = query.search.trim().replace(/[%_,]/g, '');
      const q = `%${term}%`;
      builder = builder.or(
        `email.ilike.${q},name.ilike.${q},phone.ilike.${q},first_name.ilike.${q},last_name.ilike.${q},state.ilike.${q},district.ilike.${q}`
      );
    }

    if (stateFilter) {
      builder = builder.ilike('state', stateFilter);
    }

    const needsStatusFilter = status === 'active' || status === 'inactive';

    if (!needsStatusFilter) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const { data, error, count } = await builder.range(from, to);
      throwIfSupabaseError(error, 'Could not load farmers');

      const rows = data ?? [];
      const ids = rows.map((r) => String(r.id));
      const cropsMap = await loadCropsByFarmerIds(ids);
      const { lastOrder, orderCount } = await loadOrderMetaByPhones(rows.map((r) => r.phone as string));

      const farmers = rows.map((row) => {
        const phoneKey = normalizePhoneDigits(String(row.phone ?? ''));
        const crops = cropsMap.get(String(row.id)) ?? [];
        return enrichRow(
          row as Record<string, unknown>,
          crops,
          phoneKey ? lastOrder.get(phoneKey) ?? null : null,
          phoneKey ? orderCount.get(phoneKey) ?? 0 : 0
        );
      });

      const total = count ?? 0;
      return {
        stats,
        farmers,
        pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
      };
    }

    const { data, error } = await builder.limit(5000);
    throwIfSupabaseError(error, 'Could not load farmers');

    const allRows = data ?? [];
    const ids = allRows.map((r) => String(r.id));
    const cropsMap = await loadCropsByFarmerIds(ids);
    const { lastOrder, orderCount } = await loadOrderMetaByPhones(
      allRows.map((r) => r.phone as string)
    );

    let enriched = allRows.map((row) => {
      const phoneKey = normalizePhoneDigits(String(row.phone ?? ''));
      const crops = cropsMap.get(String(row.id)) ?? [];
      return enrichRow(
        row as Record<string, unknown>,
        crops,
        phoneKey ? lastOrder.get(phoneKey) ?? null : null,
        phoneKey ? orderCount.get(phoneKey) ?? 0 : 0
      );
    });

    if (status === 'active') enriched = enriched.filter((f) => f.status === 'active');
    if (status === 'inactive') enriched = enriched.filter((f) => f.status === 'inactive');

    const total = enriched.length;
    const from = (page - 1) * limit;
    const farmers = enriched.slice(from, from + limit);

    return {
      stats,
      farmers,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    };
  },

  async get(id: string) {
    const { data, error } = await supabase
      .from('farmers')
      .select('*, farmer_crops(crop_type, acreage, stage, is_primary)')
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundError('Farmer not found');

    const row = data as Record<string, unknown>;
    const cropsRaw = (row.farmer_crops as { crop_type: string }[] | null) ?? [];
    const crops = cropsRaw.map((c) => formatCropLabel(c.crop_type));
    const { lastOrder, orderCount } = await loadOrderMetaByPhones([String(row.phone ?? '')]);
    const phoneKey = normalizePhoneDigits(String(row.phone ?? ''));

    return {
      farmer: enrichRow(
        row,
        crops,
        phoneKey ? lastOrder.get(phoneKey) ?? null : null,
        phoneKey ? orderCount.get(phoneKey) ?? 0 : 0
      ),
      crops,
    };
  },

  async create(input: {
    phone: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    state?: string;
    district?: string;
    crops?: string;
  }) {
    if (!isValidIndianPhone(input.phone)) {
      throw new ValidationError('Invalid Indian phone number');
    }

    const name =
      input.name?.trim() ||
      [input.firstName, input.lastName].filter(Boolean).join(' ').trim() ||
      undefined;

    const row = await farmerService.upsertByPhone({
      phone: input.phone,
      name,
      state: input.state,
      district: input.district,
      source: 'admin',
    });

    if (input.firstName || input.lastName) {
      await supabase
        .from('farmers')
        .update({
          first_name: input.firstName ?? null,
          last_name: input.lastName ?? null,
          name: name ?? row.name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
    }

    const cropTypes = (input.crops ?? '')
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const cropType of cropTypes) {
      await farmerService.addCrop(row.id, { cropType, isPrimary: cropTypes[0] === cropType });
    }

    return this.get(row.id);
  },

  async update(
    id: string,
    patch: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      district?: string;
      state?: string;
      newsletterSubscribed?: boolean;
    }
  ) {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.firstName !== undefined) updates.first_name = patch.firstName;
    if (patch.lastName !== undefined) updates.last_name = patch.lastName;
    if (patch.phone !== undefined) updates.phone = patch.phone;
    if (patch.district !== undefined) updates.district = patch.district;
    if (patch.state !== undefined) updates.state = patch.state;
    if (patch.newsletterSubscribed !== undefined) {
      updates.newsletter_subscribed = patch.newsletterSubscribed;
    }
    if (patch.firstName !== undefined || patch.lastName !== undefined) {
      const { data: existing } = await supabase
        .from('farmers')
        .select('first_name, last_name')
        .eq('id', id)
        .single();
      const fn = (patch.firstName ?? existing?.first_name ?? '') as string;
      const ln = (patch.lastName ?? existing?.last_name ?? '') as string;
      updates.name = `${fn} ${ln}`.trim();
    }

    const { data, error } = await supabase.from('farmers').update(updates).eq('id', id).select().single();
    if (error || !data) throw new NotFoundError('Farmer not found');
    const { farmer } = await this.get(id);
    return farmer;
  },

  async listStates() {
    const { data, error } = await supabase.from('farmers').select('state').not('state', 'is', null);
    throwIfSupabaseError(error, 'Could not load states');
    const states = new Set<string>();
    for (const row of data ?? []) {
      const s = String(row.state ?? '').trim();
      if (s) states.add(s);
    }
    return [...states].sort((a, b) => a.localeCompare(b));
  },
};
