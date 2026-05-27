import { supabase } from '../../lib/supabase.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { eventBus } from '../../events/bus.js';
import { isValidIndianPhone, normalizePhone, normalizeWhatsAppWaId } from '../../lib/phone.js';

export interface FarmerInput {
  phone: string;
  name?: string;
  preferredLanguage?: string;
  district?: string;
  state?: string;
  shopifyCustomerId?: string;
  source?: string;
}

export interface FarmerCropInput {
  cropType: string;
  acreage?: number;
  stage?: string;
  isPrimary?: boolean;
}

export const farmerService = {
  async upsertByPhone(input: FarmerInput) {
    const phone = normalizePhone(input.phone);
    if (!isValidIndianPhone(input.phone)) throw new ValidationError('Invalid Indian phone number');

    const { data, error } = await supabase
      .from('farmers')
      .upsert(
        {
          phone,
          name: input.name ?? null,
          preferred_language: input.preferredLanguage ?? 'en',
          district: input.district ?? null,
          state: input.state ?? null,
          shopify_customer_id: input.shopifyCustomerId ?? null,
          source: input.source ?? 'api',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'phone' }
      )
      .select()
      .single();

    if (error) throw error;

    await eventBus.publish('farmer.upserted', { farmerId: data.id, phone }, 'farmer-service');
    return data;
  },

  /** WhatsApp wa_id — accepts 10-digit Indian numbers from Meta without strict pre-check. */
  async upsertFromWhatsApp(input: {
    phone: string;
    name?: string;
    preferredLanguage?: string;
  }) {
    const phone = normalizeWhatsAppWaId(input.phone);
    if (phone.length < 8) throw new ValidationError('Invalid WhatsApp phone number');

    const { data, error } = await supabase
      .from('farmers')
      .upsert(
        {
          phone,
          name: input.name ?? null,
          preferred_language: input.preferredLanguage ?? 'en',
          source: 'whatsapp',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'phone' }
      )
      .select()
      .single();

    if (error) throw error;
    await eventBus.publish('farmer.upserted', { farmerId: data.id, phone }, 'farmer-service');
    return data;
  },

  async upsertFromShopifyCustomer(input: {
    shopifyCustomerId: string;
    phone: string;
    name?: string;
  }) {
    return this.upsertByPhone({
      phone: input.phone,
      name: input.name,
      shopifyCustomerId: input.shopifyCustomerId,
      source: 'shopify',
    });
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('farmers').select('*, farmer_crops(*)').eq('id', id).single();
    if (error || !data) throw new NotFoundError('Farmer not found');
    return data;
  },

  async addCrop(farmerId: string, crop: FarmerCropInput) {
    const { data, error } = await supabase
      .from('farmer_crops')
      .insert({
        farmer_id: farmerId,
        crop_type: crop.cropType,
        acreage: crop.acreage ?? null,
        stage: crop.stage ?? null,
        is_primary: crop.isPrimary ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async logInteraction(
    farmerId: string,
    channel: string,
    direction: 'inbound' | 'outbound',
    content: string,
    metadata?: Record<string, unknown>
  ) {
    await supabase.from('interaction_logs').insert({
      farmer_id: farmerId,
      channel,
      direction,
      content,
      message_type: 'text',
      raw_payload: metadata ?? {},
    });
  },
};
