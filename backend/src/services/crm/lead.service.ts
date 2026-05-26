import { supabase } from '../../lib/supabase.js';
import { eventBus } from '../../events/bus.js';
import { farmerService } from '../farmer/farmer.service.js';

export const leadService = {
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

    const { data, error } = await supabase
      .from('leads')
      .insert({
        farmer_id: farmer.id,
        intent: input.intent,
        source: input.source,
        status: 'new',
        stage: 'new_lead',
        priority: input.intent === 'callback' ? 'high' : 'normal',
        notes: input.notes ?? null,
        assigned_to: null,
        last_interaction_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await eventBus.publish('lead.created', { leadId: data.id, intent: input.intent }, 'crm');

    if (input.intent === 'quotation') {
      await supabase.from('quotation_inquiries').insert({
        farmer_id: farmer.id,
        lead_id: data.id,
        status: 'pending',
        request_notes: input.notes,
      });
      await eventBus.publish('quotation.requested', { leadId: data.id, farmerId: farmer.id }, 'crm');
    }

    return { lead: data, farmer };
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
