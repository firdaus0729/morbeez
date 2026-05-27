import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';

export type PincodeRow = {
  id: string;
  pincode: string;
  village: string | null;
  taluk: string;
  district: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
};

function mapRow(r: Record<string, unknown>): PincodeRow {
  return {
    id: String(r.id),
    pincode: String(r.pincode),
    village: r.village ? String(r.village) : null,
    taluk: String(r.taluk),
    district: String(r.district),
    state: String(r.state),
    latitude: r.latitude != null ? Number(r.latitude) : null,
    longitude: r.longitude != null ? Number(r.longitude) : null,
  };
}

export const pincodeService = {
  async lookupByPincode(pincode: string): Promise<PincodeRow | null> {
    const normalized = pincode.replace(/\D/g, '').slice(0, 6);
    if (normalized.length !== 6) return null;

    const { data, error } = await supabase
      .from('pincode_master')
      .select('*')
      .eq('pincode', normalized)
      .eq('active', true)
      .maybeSingle();

    throwIfSupabaseError(error, 'Pincode lookup failed');
    return data ? mapRow(data) : null;
  },

  async search(params: { district?: string; q?: string; limit?: number }): Promise<PincodeRow[]> {
    let q = supabase.from('pincode_master').select('*').eq('active', true).order('district').order('pincode');

    if (params.district) q = q.ilike('district', params.district.trim());
    if (params.q?.trim()) {
      const term = params.q.trim();
      q = q.or(`pincode.ilike.${term}%,village.ilike.%${term}%,taluk.ilike.%${term}%`);
    }

    const { data, error } = await q.limit(params.limit ?? 50);
    throwIfSupabaseError(error, 'Pincode search failed');
    return (data ?? []).map(mapRow);
  },

  async assignFarmerPincode(farmerId: string, pincode: string): Promise<PincodeRow | null> {
    const row = await this.lookupByPincode(pincode);
    if (!row) return null;

    const { error } = await supabase
      .from('farmers')
      .update({
        pincode_id: row.id,
        district: row.district,
        state: row.state,
        village: row.village,
        updated_at: new Date().toISOString(),
      })
      .eq('id', farmerId);

    throwIfSupabaseError(error, 'Could not assign farmer pincode');
    return row;
  },
};
