/** Crop names inferred from farmer free text (multi-language). */
export const CROP_HINTS = [
    { crop: 'ginger', terms: ['ginger', 'inchi', 'ഇഞ്ചി', 'इंजी', 'અદ્રક', 'अदरक', 'ഇഞ്ചി'] },
    { crop: 'pepper', terms: ['pepper', 'kurumulaku', 'കുരുമുളക്', 'मिर्च', 'ಕಾಳು ಮೆಣಸು'] },
    { crop: 'cardamom', terms: ['cardamom', 'elakka', 'ഏലക്ക', 'इलायची', 'ಏಲಕ್ಕಿ'] },
    { crop: 'banana', terms: ['banana', 'vazha', 'വാഴ', 'केला', 'ಬಾಳೆ'] },
    { crop: 'turmeric', terms: ['turmeric', 'manjal', 'മഞ്ഞൾ', 'हल्दी', 'ಅರಿಶಿನ'] },
    { crop: 'coconut', terms: ['coconut', 'thenga', 'തേങ്ങ', 'नारियल', 'ತೆಂಗು'] },
];
export function inferCropHint(text) {
    if (!text?.trim())
        return null;
    const lower = text.toLowerCase();
    for (const entry of CROP_HINTS) {
        if (entry.terms.some((term) => lower.includes(term.toLowerCase()))) {
            return entry.crop;
        }
    }
    return null;
}
//# sourceMappingURL=crop-hints.js.map