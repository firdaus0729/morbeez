/** Detect farmer free-text that should use agronomy AI / DB — not menu or terminology templates. */
const AGRONOMY_QUESTION_RE =
  /\b(mix|tank\s*mix|compatible|compatibility|fertiliz|nitrate|sulphate|sulfate|pesticide|herbicide|insecticide|spray|dose|dosage|calcium|magnesium|copper|mancozeb|urea|dap|npk|fungicide|thrips|aphid|blight|wilt|yellow|chlorosis|harvest|irrigation|fertigation|nematode|weedicide|glyphosate|oxychloride)\b/i;

export function isExplicitAgronomyQuestion(text: string): boolean {
  const t = text.trim();
  if (t.length < 8) return false;
  return AGRONOMY_QUESTION_RE.test(t);
}

/** True when message looks like a substantive farming question (OpenAI / Crop Doctor), not a regional term lookup. */
export function isLikelyUnknownRegionalPhrase(text: string): boolean {
  const t = text.trim();
  if (t.length < 3 || t.length > 40) return false;
  if (/^(hi|hello|menu|yes|no|thanks|ok)$/i.test(t)) return false;
  if (isExplicitAgronomyQuestion(t)) return false;
  if (/\?/.test(t) && t.split(/\s+/).length >= 3) return false;
  if (/\b(can|how|what|why|when|is|are|mix|with|and)\b/i.test(t)) return false;

  const words = t.split(/\s+/).filter(Boolean);
  if (words.length === 1 && /^[a-z]{3,14}$/i.test(words[0])) {
    return true;
  }
  if (words.length <= 2 && /[\u0D00-\u0D7F]{3,}/.test(t) && !/\b(വിള|രോഗ|കീട|മിശ്രണം)\b/.test(t)) {
    return true;
  }
  return false;
}
