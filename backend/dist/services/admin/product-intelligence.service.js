import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
const SECTIONS = ['basic', 'agriculture', 'ai_mapping', 'seo', 'cross_sell'];
function emptyRecord() {
    return {};
}
function mapRow(row) {
    return {
        shopifyProductId: row.shopify_product_id,
        basic: row.basic ?? {},
        agriculture: row.agriculture ?? {},
        aiMapping: row.ai_mapping ?? {},
        seo: row.seo ?? {},
        crossSell: row.cross_sell ?? {},
        updatedAt: row.updated_at,
    };
}
export const productIntelligenceService = {
    async get(shopifyProductId) {
        const { data, error } = await supabase
            .from('product_intelligence')
            .select('*')
            .eq('shopify_product_id', shopifyProductId)
            .maybeSingle();
        throwIfSupabaseError(error, 'Could not load product intelligence');
        if (!data) {
            return {
                shopifyProductId,
                basic: emptyRecord(),
                agriculture: emptyRecord(),
                aiMapping: emptyRecord(),
                seo: emptyRecord(),
                crossSell: emptyRecord(),
                updatedAt: null,
            };
        }
        return mapRow(data);
    },
    async upsert(shopifyProductId, input, adminId) {
        const existing = await this.get(shopifyProductId);
        const payload = {
            shopify_product_id: shopifyProductId,
            basic: input.basic ?? existing.basic,
            agriculture: input.agriculture ?? existing.agriculture,
            ai_mapping: input.ai_mapping ?? existing.aiMapping,
            seo: input.seo ?? existing.seo,
            cross_sell: input.cross_sell ?? existing.crossSell,
            updated_at: new Date().toISOString(),
            updated_by: adminId ?? null,
        };
        const { data, error } = await supabase
            .from('product_intelligence')
            .upsert(payload, { onConflict: 'shopify_product_id' })
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not save product intelligence');
        return mapRow(data);
    },
};
//# sourceMappingURL=product-intelligence.service.js.map