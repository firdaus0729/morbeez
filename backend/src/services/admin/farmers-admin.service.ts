import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError } from '../../lib/errors.js';

export interface FarmerListQuery {
  page?: number;
  limit?: number;
  search?: string;
}

function mapFarmer(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    firstName: row.first_name,
    lastName: row.last_name,
    name: row.name,
    district: row.district,
    state: row.state,
    source: row.source,
    newsletterSubscribed: row.newsletter_subscribed,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const farmersAdminService = {
  async list(query: FarmerListQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 25));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let builder = supabase
      .from('farmers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (query.search?.trim()) {
      const term = query.search.trim().replace(/[%_,]/g, '');
      const q = `%${term}%`;
      builder = builder.or(
        `email.ilike.${q},name.ilike.${q},phone.ilike.${q},first_name.ilike.${q},last_name.ilike.${q}`
      );
    }

    const { data, error, count } = await builder;
    throwIfSupabaseError(error, 'Could not load farmers');

    return {
      farmers: (data ?? []).map(mapFarmer),
      pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
    };
  },

  async get(id: string) {
    const { data, error } = await supabase.from('farmers').select('*').eq('id', id).single();
    if (error || !data) throw new NotFoundError('Farmer not found');
    return mapFarmer(data);
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
      const { data: existing } = await supabase.from('farmers').select('first_name, last_name').eq('id', id).single();
      const fn = (patch.firstName ?? existing?.first_name ?? '') as string;
      const ln = (patch.lastName ?? existing?.last_name ?? '') as string;
      updates.name = `${fn} ${ln}`.trim();
    }

    const { data, error } = await supabase.from('farmers').update(updates).eq('id', id).select().single();
    if (error || !data) throw new NotFoundError('Farmer not found');
    return mapFarmer(data);
  },
};
