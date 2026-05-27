import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';

export const whatsappOsAdminService = {
  async getConversationSession(farmerId: string) {
    const { data, error } = await supabase
      .from('conversation_sessions')
      .select('*')
      .eq('farmer_id', farmerId)
      .eq('channel', 'whatsapp')
      .maybeSingle();
    throwIfSupabaseError(error, 'Could not load conversation session');
    return data;
  },

  async updateConversationSession(
    farmerId: string,
    patch: {
      aiPaused?: boolean;
      owner?: 'ai' | 'telecaller' | 'agronomist';
      preferredLanguage?: string | null;
      activePlotId?: string | null;
      activeBlockId?: string | null;
    }
  ) {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.aiPaused !== undefined) payload.ai_paused = patch.aiPaused;
    if (patch.owner) payload.conversation_owner = patch.owner;
    if (patch.preferredLanguage !== undefined) payload.preferred_language = patch.preferredLanguage;
    const blockId = patch.activeBlockId ?? patch.activePlotId;
    if (blockId !== undefined) {
      payload.active_block_id = blockId;
      payload.active_plot_id = blockId;
    }

    const { data, error } = await supabase
      .from('conversation_sessions')
      .update(payload)
      .eq('farmer_id', farmerId)
      .eq('channel', 'whatsapp')
      .select('*')
      .single();
    throwIfSupabaseError(error, 'Could not update conversation session');

    if (patch.preferredLanguage) {
      await supabase
        .from('farmers')
        .update({ preferred_language: patch.preferredLanguage, updated_at: new Date().toISOString() })
        .eq('id', farmerId);
    }

    return data;
  },

  async listCropDailyPrices(cropType?: string) {
    const today = new Date().toISOString().slice(0, 10);
    let q = supabase
      .from('crop_daily_prices')
      .select('*')
      .eq('price_date', today)
      .eq('active', true)
      .order('market_name');
    if (cropType) q = q.eq('crop_type', cropType);
    const { data, error } = await q;
    throwIfSupabaseError(error, 'Could not load crop prices');
    return data ?? [];
  },

  async upsertCropDailyPrice(row: {
    cropType: string;
    marketName: string;
    district?: string;
    pricePerKg: number;
    lastYearPricePerKg?: number;
    priceDate?: string;
  }) {
    const priceDate = row.priceDate ?? new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('crop_daily_prices')
      .upsert(
        {
          crop_type: row.cropType,
          market_name: row.marketName,
          district: row.district ?? null,
          price_per_kg: row.pricePerKg,
          last_year_price_per_kg: row.lastYearPricePerKg ?? null,
          price_date: priceDate,
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'crop_type,market_name,price_date' }
      )
      .select('*')
      .single();
    throwIfSupabaseError(error, 'Could not save crop price');
    return data;
  },

  async listTerminologyReviewTasks(status: string = 'open') {
    const allowed = new Set(['open', 'in_review', 'resolved', 'dismissed', 'all']);
    const s = allowed.has(status) ? status : 'open';

    let q = supabase
      .from('terminology_review_tasks')
      .select('*, farmers(phone, name, district, state, preferred_language)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (s !== 'all') q = q.eq('status', s);
    const { data, error } = await q;
    throwIfSupabaseError(error, 'Could not load terminology tasks');
    return data ?? [];
  },

  async updateTerminologyTask(
    id: string,
    patch: {
      status: 'open' | 'in_review' | 'resolved' | 'dismissed';
      resolutionMeaning?: string;
      assignedTo?: string;
      resolvedBy?: string;
    }
  ) {
    const payload: Record<string, unknown> = { status: patch.status };
    if (patch.assignedTo !== undefined) payload.assigned_to = patch.assignedTo;
    if (patch.resolutionMeaning !== undefined) payload.resolution_meaning = patch.resolutionMeaning;
    if (patch.status === 'resolved' || patch.status === 'dismissed') {
      payload.resolved_at = new Date().toISOString();
      if (patch.resolvedBy) payload.resolved_by = patch.resolvedBy;
    }

    const { data, error } = await supabase
      .from('terminology_review_tasks')
      .update(payload)
      .eq('id', id)
      .select('*, farmers(phone, name, district, state, preferred_language)')
      .single();
    throwIfSupabaseError(error, 'Could not update terminology task');
    return data;
  },
};

