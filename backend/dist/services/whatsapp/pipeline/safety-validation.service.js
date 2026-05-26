const HIGH_RISK_PATTERNS = /\b(pesticide overdose|double dose|mix all chemicals|eat|consume|drink|human medicine)\b/i;
export function validateAdvisorySafety(advisory, language) {
    const blob = JSON.stringify(advisory).toLowerCase();
    if (HIGH_RISK_PATTERNS.test(blob)) {
        return {
            safe: false,
            reason: 'high_risk_language',
            farmerMessage: safetyBlockedMessage(language),
        };
    }
    for (const d of advisory.dosageGuidance ?? []) {
        const rate = String(d.rate ?? '').toLowerCase();
        if (/\d{3,}\s*(ml|g|kg|l)\s*\/\s*(l|liter)/i.test(rate)) {
            return {
                safe: false,
                reason: 'dosage_suspect',
                farmerMessage: safetyBlockedMessage(language),
            };
        }
    }
    return { safe: true };
}
function safetyBlockedMessage(language) {
    const messages = {
        en: 'This recommendation needs agronomist review before you apply it. Our team will contact you shortly. Type "call" for urgent help.',
        ml: 'ഈ നിർദേശം പ്രയോഗിക്കുന്നതിന് മുമ്പ് വിദഗ്ധ പരിശോധന ആവശ്യമാണ്. അടിയന്തിര സഹായത്തിന് "call" ടൈപ്പ് ചെയ്യുക.',
    };
    return messages[language] ?? messages.en;
}
//# sourceMappingURL=safety-validation.service.js.map