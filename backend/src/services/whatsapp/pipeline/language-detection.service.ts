import type { AdvisoryLanguage } from '../../ai/types.js';

const ML_RANGE = /[\u0D00-\u0D7F]/;
const TA_RANGE = /[\u0B80-\u0BFF]/;
const KN_RANGE = /[\u0C80-\u0CFF]/;
const HI_RANGE = /[\u0900-\u097F]/;

/** Detect farmer language from text (Unicode script heuristics). */
export function detectLanguageFromText(text: string): AdvisoryLanguage | null {
  const t = text.trim();
  if (!t) return null;

  const counts = {
    ml: (t.match(ML_RANGE) ?? []).length,
    ta: (t.match(TA_RANGE) ?? []).length,
    kn: (t.match(KN_RANGE) ?? []).length,
    hi: (t.match(HI_RANGE) ?? []).length,
  };

  const max = Math.max(counts.ml, counts.ta, counts.kn, counts.hi);
  if (max === 0) return 'en';

  if (counts.ml === max) return 'ml';
  if (counts.ta === max) return 'ta';
  if (counts.kn === max) return 'kn';
  if (counts.hi === max) return 'hi';
  return 'en';
}

export function normalizeLanguage(
  detected: AdvisoryLanguage | null,
  stored?: string | null
): AdvisoryLanguage {
  const allowed: AdvisoryLanguage[] = ['en', 'ml', 'ta', 'kn', 'hi'];
  if (detected && allowed.includes(detected)) return detected;
  if (stored && allowed.includes(stored as AdvisoryLanguage)) return stored as AdvisoryLanguage;
  return 'en';
}
