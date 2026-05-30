import { supabase } from '../../lib/supabase.js';
import { eventBus } from '../../events/bus.js';
import { farmerService } from '../farmer/farmer.service.js';

const STAGE_RANK: Record<string, number> = {
  new_lead: 1,
  interested: 2,
  follow_up: 3,
  recommendation: 4,
  order_placed: 5,
  repeat_customer: 6,
};

const PRIORITY_RANK: Record<string, number> = {
  low: 1,
  normal: 2,
  high: 3,
  urgent: 4,
};

function stageRank(stage: string | null | undefined): number {
  return STAGE_RANK[stage ?? 'new_lead'] ?? 0;
}

function priorityRank(priority: string | null | undefined): number {
  return PRIORITY_RANK[priority ?? 'normal'] ?? 2;
}

export type EnsureLeadInput = {
  farmerId: string;
  intent?: 'quotation' | 'callback' | 'support' | 'dealer' | 'general';
  source?: string;
  status?: string;
  stage?: string;
  priority?: string;
  notes?: string;
  assigned_to?: string | null;
  follow_up_at?: string | null;
  campaign_source?: string | null;
  referral_source?: string | null;
  affiliate_source?: string | null;
  whatsapp_profile_name?: string | null;
  /** Append notes to existing lead instead of replacing. */
  mergeNotes?: boolean;
};

/** One CRM lead per farmer — returns existing or creates. */
export const leadService = {
  async ensureLeadForFarmer(input: EnsureLeadInput): Promise<{
    lead: Record<string, unknown>;
    created: boolean;
  }> {
    const now = new Date().toISOString();

    const { data: existing, error: loadErr } = await supabase
      .from('leads')
      .select('*')
      .eq('farmer_id', input.farmerId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (loadErr) throw loadErr;

    if (existing) {
      const patch: Record<string, unknown> = {
        updated_at: now,
        last_interaction_at: now,
      };

      if (input.intent && input.intent !== 'general') patch.intent = input.intent;
      if (input.source) patch.source = input.source;
      if (input.status) patch.status = input.status;

      if (input.stage && stageRank(input.stage) >= stageRank(String(existing.stage))) {
        patch.stage = input.stage;
      }

      const nextPriority =
        input.priority && priorityRank(input.priority) > priorityRank(String(existing.priority))
          ? input.priority
          : null;
      if (nextPriority) patch.priority = nextPriority;

      if (input.assigned_to !== undefined) patch.assigned_to = input.assigned_to;
      if (input.follow_up_at !== undefined) patch.follow_up_at = input.follow_up_at;
      if (input.campaign_source) patch.campaign_source = input.campaign_source;
      if (input.referral_source) patch.referral_source = input.referral_source;
      if (input.affiliate_source) patch.affiliate_source = input.affiliate_source;
      if (input.whatsapp_profile_name) patch.whatsapp_profile_name = input.whatsapp_profile_name;

      if (input.notes) {
        patch.notes = input.mergeNotes
          ? [existing.notes, input.notes].filter(Boolean).join('\n')
          : input.notes;
      }

      const { data: updated, error: updErr } = await supabase
        .from('leads')
        .update(patch)
        .eq('id', existing.id)
        .select()
        .single();

      if (updErr) throw updErr;
      return { lead: updated, created: false };
    }

    const { data, error } = await supabase
      .from('leads')
      .insert({
        farmer_id: input.farmerId,
        intent: input.intent ?? 'general',
        source: input.source ?? 'api',
        status: input.status ?? 'new',
        stage: input.stage ?? 'new_lead',
        priority: input.priority ?? (input.intent === 'callback' ? 'high' : 'normal'),
        notes: input.notes ?? null,
        assigned_to: input.assigned_to ?? null,
        follow_up_at: input.follow_up_at ?? null,
        campaign_source: input.campaign_source ?? null,
        referral_source: input.referral_source ?? null,
        affiliate_source: input.affiliate_source ?? null,
        whatsapp_profile_name: input.whatsapp_profile_name ?? null,
        last_interaction_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    await eventBus.publish('lead.created', { leadId: data.id, intent: data.intent }, 'crm');
    return { lead: data, created: true };
  },

  async createLead(input: {
    phone: string;
    name?: string;
    intent: 'quotation' | 'callback' | 'support' | 'dealer' | 'general';
    source: 'web' | 'whatsapp' | 'shopify' | 'phone';
    notes?: string;
    cropType?: string;
    district?: string;
  }) {
    const farmer = await farmerService.upsertByPhone({
      phone: input.phone,
      name: input.name,
      district: input.district,
      source: input.source,
    });

    if (input.cropType) {
      await farmerService.addCrop(farmer.id, { cropType: input.cropType, isPrimary: true });
    }

    const { lead, created } = await this.ensureLeadForFarmer({
      farmerId: farmer.id,
      intent: input.intent,
      source: input.source,
      status: 'new',
      stage: 'new_lead',
      priority: input.intent === 'callback' ? 'high' : 'normal',
      notes: input.notes,
      mergeNotes: true,
    });

    if (input.intent === 'quotation' && created) {
      await supabase.from('quotation_inquiries').insert({
        farmer_id: farmer.id,
        lead_id: String(lead.id),
        status: 'pending',
        request_notes: input.notes,
      });
      await eventBus.publish(
        'quotation.requested',
        { leadId: lead.id, farmerId: farmer.id },
        'crm'
      );
    }

    return { lead, farmer };
  },

  async listLeads(status?: string, limit = 50) {
    let q = supabase
      .from('leads')
      .select('*, farmers(phone, name, district)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
};
