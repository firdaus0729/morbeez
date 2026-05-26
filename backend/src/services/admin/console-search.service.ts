import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';

function displayName(row: {
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): string {
  const first = String(row.first_name ?? '').trim();
  const last = String(row.last_name ?? '').trim();
  const combined = [first, last].filter(Boolean).join(' ');
  return combined || String(row.name ?? '').trim() || 'Farmer';
}

export const consoleSearchService = {
  async search(query: string, limit = 12) {
    const term = query.trim().replace(/[%_,]/g, '');
    if (term.length < 2) {
      return { farmers: [], leads: [], orders: [] };
    }
    const q = `%${term}%`;

    const [farmersRes, leadsRes, ordersRes] = await Promise.all([
      supabase
        .from('farmers')
        .select('id, name, first_name, last_name, phone, state, district')
        .or(`name.ilike.${q},phone.ilike.${q},first_name.ilike.${q},last_name.ilike.${q},state.ilike.${q}`)
        .limit(limit),
      supabase
        .from('leads')
        .select('id, stage, notes, farmers(name, first_name, last_name, phone)')
        .limit(limit),
      supabase
        .from('commerce_orders')
        .select('id, order_name, phone, email, total_amount')
        .or(`order_name.ilike.${q},phone.ilike.${q},email.ilike.${q}`)
        .limit(limit),
    ]);

    throwIfSupabaseError(farmersRes.error, 'Search failed');
    throwIfSupabaseError(leadsRes.error, 'Search failed');
    throwIfSupabaseError(ordersRes.error, 'Search failed');

    function farmerFromJoin(raw: unknown) {
      const f = Array.isArray(raw) ? raw[0] : raw;
      return f as Parameters<typeof displayName>[0] | null | undefined;
    }

    const leads = (leadsRes.data ?? [])
      .filter((row) => {
        const farmer = farmerFromJoin(row.farmers);
        const hay = [
          farmer ? displayName(farmer) : '',
          (farmer as { phone?: string })?.phone,
          row.notes,
          row.stage,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(term.toLowerCase());
      })
      .slice(0, limit)
      .map((row) => {
        const farmer = farmerFromJoin(row.farmers);
        return {
          id: row.id,
          type: 'lead',
          title: farmer ? displayName(farmer) : 'Lead',
          subtitle: String((farmer as { phone?: string })?.phone ?? row.stage ?? ''),
          hash: `telecaller`,
          meta: { leadId: row.id },
        };
      });

    return {
      farmers: (farmersRes.data ?? []).map((f) => ({
        id: f.id,
        type: 'farmer',
        title: displayName(f),
        subtitle: [f.phone, f.state].filter(Boolean).join(' · '),
        hash: 'farmers',
      })),
      leads,
      orders: (ordersRes.data ?? []).map((o) => ({
        id: o.id,
        type: 'order',
        title: o.order_name ? String(o.order_name) : `Order ${String(o.id).slice(0, 8)}`,
        subtitle: [o.phone, o.email].filter(Boolean).join(' · '),
        hash: `orders/detail/${o.id}`,
      })),
    };
  },
};
