import { supabase } from '../../../lib/supabase.js';
import type { AdvisoryLanguage } from '../../ai/types.js';

type FaqRow = {
  id: string;
  faq_key: string;
  keywords: string[];
  hit_count: number;
  response_en: string;
  response_ml: string | null;
  response_ta: string | null;
  response_kn: string | null;
  response_hi: string | null;
};

let cache: FaqRow[] | null = null;
let cacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function loadFaqs(): Promise<FaqRow[]> {
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) return cache;
  const { data } = await supabase
    .from('advisory_faq_cache')
    .select(
      'id, faq_key, keywords, hit_count, response_en, response_ml, response_ta, response_kn, response_hi'
    )
    .eq('active', true);
  cache = (data ?? []) as FaqRow[];
  cacheAt = Date.now();
  return cache;
}

function pickResponse(row: FaqRow, language: AdvisoryLanguage): string {
  if (language === 'ml' && row.response_ml) return row.response_ml;
  if (language === 'ta' && row.response_ta) return row.response_ta;
  if (language === 'kn' && row.response_kn) return row.response_kn;
  if (language === 'hi' && row.response_hi) return row.response_hi;
  return row.response_en;
}

export const faqCacheService = {
  async match(text: string, language: AdvisoryLanguage): Promise<string | null> {
    const normalized = text.toLowerCase().trim();
    if (normalized.length < 2) return null;

    const faqs = await loadFaqs();
    for (const row of faqs) {
      const hit = row.keywords.some((kw) => normalized.includes(kw.toLowerCase()));
      if (!hit) continue;

      void supabase
        .from('advisory_faq_cache')
        .update({ hit_count: row.hit_count + 1, updated_at: new Date().toISOString() })
        .eq('id', row.id);

      return pickResponse(row, language);
    }
    return null;
  },
};
