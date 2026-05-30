/** Detect farmer disagreement / correction intent (multilingual keywords). */
const DISAGREEMENT_PATTERNS = [
    /\b(ai\s+)?(is\s+)?wrong\b/i,
    /\bnot\s+(correct|right|fungus|disease|accurate)\b/i,
    /\bincorrect\b/i,
    /\bthis\s+is\s+(not|no)\b/i,
    /\b(this\s+is|its|it's)\s+\w+/i, // "this is thrips" — handled with pest/disease nouns below
    /\balready\s+had\b/i,
    /\blast\s+(year|time|season)\b/i,
    /\bhappened\s+before\b/i,
    /\b(i\s+)?know\s+this\b/i,
    /\bതെറ്റ്\b/,
    /\bഎനിക്ക്\s+അറിയാം\b/,
    /\bകഴിഞ്ഞ\b/,
    /\bதவறு\b/,
    /\bநான்\s+அறிவேன்\b/,
];
const CORRECTION_ISSUE_PATTERNS = [
    /\b(this\s+is|its|it's)\s+(thrips?|mites?|aphids?|fungus|fungal|nematode|blight|rust|spot)\b/i,
    /\b(not\s+fungus|not\s+thrips)\b/i,
];
const PRIOR_TREATMENT_PATTERNS = [
    /\b(last\s+time|previously|before)\b/i,
    /\bworked\b/i,
    /\b(spinetoram|fipronil|mancozeb|azoxystrobin|copper|neem)\b/i,
    /\bസ്പിനെടോറം\b/i,
];
export function isFarmerDisagreementIntent(text) {
    const t = text.trim();
    if (t.length < 4)
        return false;
    if (DISAGREEMENT_PATTERNS.some((p) => p.test(t)))
        return true;
    if (CORRECTION_ISSUE_PATTERNS.some((p) => p.test(t)))
        return true;
    if (/\bfeedback\.disagree\b/i.test(t))
        return true;
    return false;
}
export function extractSuggestedDiagnosis(text) {
    const t = text.trim();
    const m = t.match(/\b(?:this\s+is|its|it's|ഇത്)\s+([a-zA-Z\u0D00-\u0D7F\u0B80-\u0BFF\s-]{2,60})/i);
    if (m?.[1])
        return m[1].trim().slice(0, 200);
    const pest = t.match(/\b(thrips?|mites?|aphids?|whitefly|borer|nematode|fungal?\s+infection|leaf\s+spot|blight)\b/i);
    if (pest?.[1])
        return pest[1].trim();
    return null;
}
export function extractPriorProduct(text) {
    const m = text.match(/\b(spinetoram|fipronil|mancozeb|azoxystrobin|tebuconazole|copper\s+oxychloride|neem|profenofos|dimethoate)\b/i);
    return m?.[1] ? m[1].trim() : null;
}
export function looksLikePriorExperience(text) {
    return PRIOR_TREATMENT_PATTERNS.some((p) => p.test(text));
}
//# sourceMappingURL=farmer-feedback-intent.service.js.map