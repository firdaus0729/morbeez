import type { AdvisoryLanguage } from '../../ai/types.js';
/** Detect farmer language from text (Unicode script heuristics). */
export declare function detectLanguageFromText(text: string): AdvisoryLanguage | null;
export declare function normalizeLanguage(detected: AdvisoryLanguage | null, stored?: string | null): AdvisoryLanguage;
//# sourceMappingURL=language-detection.service.d.ts.map