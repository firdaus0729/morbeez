import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';

const SECTIONS = ['basic', 'agriculture', 'ai_mapping', 'seo', 'cross_sell'] as const;

export type IntelligenceSection = (typeof SECTIONS)[number];

function emptyRecord(): Record<string, unknown> {
  return {};
}

function mapRow(row: Record<string, unknown>) {
  return {
    shopifyProductId: row.shopify_product_id,
    basic: (row.basic as Record<string, unknown>) ?? {},
    agriculture: (row.agriculture as Record<string, unknown>) ?? {},
    aiMapping: (row.ai_mapping as Record<string, unknown>) ?? {},
    seo: (row.seo as Record<string, unknown>) ?? {},
    crossSell: (row.cross_sell as Record<string, unknown>) ?? {},
    updatedAt: row.updated_at,
  };
}

export const productIntelligenceService = {
  async get(shopifyProductId: string) {
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

  async upsert(
    shopifyProductId: string,
    input: Partial<Record<IntelligenceSection, Record<string, unknown>>>,
    adminId?: string
  ) {
    const existing = await this.get(shopifyProductId);
    const payload: Record<string, unknown> = {
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
    return mapRow(data!);
  },
};
