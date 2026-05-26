const BLOCKED_TOPICS = /\b(bitcoin|crypto|stock|politics|election|python|javascript|code|hack|dating|movie|song lyrics)\b/i;
const AGRI_SIGNALS = /\b(crop|farm|ginger|pepper|plant|leaf|disease|pest|spray|fertiliz|manure|harvest|വിള|രോഗ|കൃഷി|பயிர|ಬೆಳೆ|फसल|कीट|रोग)\b/i;
export function validateAgricultureIntent(params) {
    if (params.hasCropMedia)
        return { allowed: true };
    const text = params.text.trim();
    if (!text)
        return { allowed: true };
    if (BLOCKED_TOPICS.test(text)) {
        return {
            allowed: false,
            reason: 'non_agriculture',
        };
    }
    if (text.length < 8 && !AGRI_SIGNALS.test(text)) {
        return { allowed: true };
    }
    if (text.length >= 20 && !AGRI_SIGNALS.test(text) && !/\?/.test(text)) {
        return { allowed: false, reason: 'off_topic' };
    }
    return { allowed: true };
}
export function guardRejectionMessage(language) {
    const messages = {
        en: 'Morbeez Crop Doctor helps with crop health, pests, and farming advice. Send a crop photo or describe your crop problem.',
        ml: 'മോർബീസ് ക്രോപ്പ് ഡോക്ടർ വിള രോഗം, കീടം, കൃഷി ഉപദേശം എന്നിവയ്ക്കാണ്. വിളയുടെ ഫോട്ടോ അയയ്ക്കുക അല്ലെങ്കിൽ പ്രശ്നം വിവരിക്കുക.',
        ta: 'மோர்பீஸ் பயிர் ஆலோசனை — பயிர் நோய், பூச்சி. பயிர் புகைப்படம் அனுப்பவும்.',
        kn: 'ಮೋರ್ಬೀಸ್ ಬೆಳೆ ಸಲಹೆ — ಬೆಳೆ ರೋಗ, ಕೀಟ. ಬೆಳೆಯ ಫೋಟೋ ಕಳುಹಿಸಿ.',
        hi: 'मोर्बीज़ फसल सलाह — फसल रोग, कीट। फसल की फोटो भेजें।',
    };
    return messages[language] ?? messages.en;
}
//# sourceMappingURL=agriculture-guard.service.js.map