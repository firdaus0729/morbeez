import { supabase } from '../../lib/supabase.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { eventBus } from '../../events/bus.js';
import { isValidIndianPhone, normalizePhone, normalizeWhatsAppWaId } from '../../lib/phone.js';
export const farmerService = {
    async upsertByPhone(input) {
        const phone = normalizePhone(input.phone);
        if (!isValidIndianPhone(input.phone))
            throw new ValidationError('Invalid Indian phone number');
        const { data, error } = await supabase
            .from('farmers')
            .upsert({
            phone,
            name: input.name ?? null,
            preferred_language: input.preferredLanguage ?? 'en',
            district: input.district ?? null,
            state: input.state ?? null,
            shopify_customer_id: input.shopifyCustomerId ?? null,
            source: input.source ?? 'api',
            updated_at: new Date().toISOString(),
        }, { onConflict: 'phone' })
            .select()
            .single();
        if (error)
            throw error;
        await eventBus.publish('farmer.upserted', { farmerId: data.id, phone }, 'farmer-service');
        return data;
    },
    /** WhatsApp wa_id — accepts 10-digit Indian numbers from Meta without strict pre-check. */
    async upsertFromWhatsApp(input) {
        const phone = normalizeWhatsAppWaId(input.phone);
        if (phone.length < 8)
            throw new ValidationError('Invalid WhatsApp phone number');
        const { data, error } = await supabase
            .from('farmers')
            .upsert({
            phone,
            name: input.name ?? null,
            preferred_language: input.preferredLanguage ?? 'en',
            source: 'whatsapp',
            updated_at: new Date().toISOString(),
        }, { onConflict: 'phone' })
            .select()
            .single();
        if (error)
            throw error;
        await eventBus.publish('farmer.upserted', { farmerId: data.id, phone }, 'farmer-service');
        return data;
    },
    async upsertFromShopifyCustomer(input) {
        return this.upsertByPhone({
            phone: input.phone,
            name: input.name,
            shopifyCustomerId: input.shopifyCustomerId,
            source: 'shopify',
        });
    },
    async getById(id) {
        const { data, error } = await supabase.from('farmers').select('*, farmer_crops(*)').eq('id', id).single();
        if (error || !data)
            throw new NotFoundError('Farmer not found');
        return data;
    },
    async addCrop(farmerId, crop) {
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
        if (error)
            throw error;
        return data;
    },
    async logInteraction(farmerId, channel, direction, content, metadata) {
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
//# sourceMappingURL=farmer.service.js.map