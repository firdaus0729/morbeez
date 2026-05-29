import { supabase } from '../../../lib/supabase.js';
import type { AdvisoryLanguage } from '../../ai/types.js';
import { responseComposerService } from './response-composer.service.js';

export type CompatibilityLookupResult = {
  found: boolean;
  productA?: string;
  productB?: string;
  compatible?: boolean;
  minIntervalHours?: number | null;
  notes?: string | null;
};

/** Extract two product names from farmer tank-mix questions. */
export function parseProductPairFromText(text: string): { productA: string; productB: string } | null {
  const t = text.trim();
  if (t.length < 8) return null;

  const patterns = [
    /(?:mix|combine|tank\s*mix|spray)\s+(.+?)\s+(?:and|with|\+|&)\s+(.+?)(?:\?|$)/i,
    /(.+?)\s+(?:and|with|\+)\s+(.+?)\s+(?:mix|together|compatible)/i,
    /(?:can i|is it ok to)\s+(?:mix|combine)\s+(.+?)\s+(?:and|with)\s+(.+?)(?:\?|$)/i,
  ];

  for (const re of patterns) {
    const m = t.match(re);
    if (m?.[1] && m?.[2]) {
      const productA = cleanProductToken(m[1]);
      const productB = cleanProductToken(m[2]);
      if (productA.length >= 2 && productB.length >= 2) {
        return { productA, productB };
      }
    }
  }
  return null;
}

function cleanProductToken(raw: string): string {
  return raw
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/[?.!,]+$/g, '')
    .trim()
    .slice(0, 80);
}

function normalizeKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export const compatibilityLookupService = {
  parseProductPairFromText,

  async lookup(productA: string, productB: string): Promise<CompatibilityLookupResult> {
    const a = productA.trim();
    const b = productB.trim();
    if (!a || !b) return { found: false };

    const { data, error } = await supabase
      .from('spray_compatibility_rules')
      .select('product_a, product_b, compatible, min_interval_hours, notes')
      .eq('active', true);

    if (error || !data?.length) return { found: false };

    const keyA = normalizeKey(a);
    const keyB = normalizeKey(b);

    for (const row of data) {
      const ra = normalizeKey(String(row.product_a));
      const rb = normalizeKey(String(row.product_b));
      const matchDirect =
        (keyA.includes(ra) || ra.includes(keyA)) && (keyB.includes(rb) || rb.includes(keyB));
      const matchSwap =
        (keyA.includes(rb) || rb.includes(keyA)) && (keyB.includes(ra) || ra.includes(keyB));
      if (matchDirect || matchSwap) {
        return {
          found: true,
          productA: String(row.product_a),
          productB: String(row.product_b),
          compatible: Boolean(row.compatible),
          minIntervalHours: row.min_interval_hours as number | null,
          notes: row.notes ? String(row.notes) : null,
        };
      }
    }

    return { found: false, productA: a, productB: b };
  },

  formatFarmerReply(
    lookup: CompatibilityLookupResult,
    language: AdvisoryLanguage,
    parsed?: { productA: string; productB: string }
  ): string {
    const a = lookup.productA ?? parsed?.productA ?? 'Product A';
    const b = lookup.productB ?? parsed?.productB ?? 'Product B';

    if (!lookup.found) {
      const body =
        language === 'ml'
          ? `${a} + ${b} മിശ്രണം ഡാറ്റാബേസിൽ ഇല്ല.`
          : `We do not have a verified rule for mixing ${a} + ${b}.`;
      return responseComposerService.compose({
        body,
        validationQuestion:
          language === 'ml'
            ? 'ഏത് രണ്ട് ഉൽപ്പന്നങ്ങളാണ് ടാങ്കിൽ ചേർക്കാൻ പ്ലാൻ ചെയ്യുന്നത്?'
            : 'Which exact product names are on the labels?',
        footer:
          (language === 'ml'
            ? 'വലിയ സ്പ്രേയ്ക്ക് മുമ്പ് jar test നടത്തുക.'
            : 'Jar test recommended before large-scale spraying.') +
          '\n\n' +
          responseComposerService.advisoryDisclaimer(language),
      });
    }

    const compatible = lookup.compatible === true;
    const interval =
      lookup.minIntervalHours != null ? `${lookup.minIntervalHours} hours` : null;

    let body: string;
    if (language === 'ml') {
      body = compatible
        ? `${a} + ${b}: ഡാറ്റാബേസിൽ പൊരുത്തപ്പെടുന്നു എന്ന് രേഖപ്പെടുത്തിയിട്ടുണ്ട്.`
        : `${a} + ${b}: ഡാറ്റാബേസിൽ ഒരുമിച്ച് മിശ്രണം ശുപാർശ ചെയ്യുന്നില്ല.`;
      if (interval && !compatible) body += `\nകുറഞ്ഞ ഇടവേള: ${interval}.`;
      if (lookup.notes) body += `\n${lookup.notes}`;
    } else {
      body = compatible
        ? `${a} + ${b}: recorded as compatible in our database.`
        : `${a} + ${b}: not recommended as a tank mix in our database.`;
      if (interval && !compatible) body += `\nMinimum gap: ${interval}.`;
      if (lookup.notes) body += `\n${lookup.notes}`;
    }

    return responseComposerService.compose({
      body,
      footer:
        (language === 'ml'
          ? 'വലിയ സ്പ്രേയ്ക്ക് മുമ്പ് jar test നടത്തുക. ഉറപ്പില്ലെങ്കിൽ കോൾബാക്ക് അഭ്യർത്ഥിക്കുക.'
          : 'Jar test before large-scale spraying. Request callback if unsure.') +
        '\n\n' +
        responseComposerService.advisoryDisclaimer(language),
    });
  },
};
