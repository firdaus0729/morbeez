import type { AdvisoryLanguage } from '../../ai/types.js';
export type CompatibilityLookupResult = {
    found: boolean;
    productA?: string;
    productB?: string;
    compatible?: boolean;
    minIntervalHours?: number | null;
    notes?: string | null;
};
/** Extract two product names from farmer tank-mix questions. */
export declare function parseProductPairFromText(text: string): {
    productA: string;
    productB: string;
} | null;
export declare const compatibilityLookupService: {
    parseProductPairFromText: typeof parseProductPairFromText;
    lookup(productA: string, productB: string): Promise<CompatibilityLookupResult>;
    formatFarmerReply(lookup: CompatibilityLookupResult, language: AdvisoryLanguage, parsed?: {
        productA: string;
        productB: string;
    }): string;
};
/** DB-backed tank-mix reply when we have a verified rule; otherwise false so OpenAI can answer. */
export declare function tryCompatibilityQuickReply(params: {
    text: string;
    language: AdvisoryLanguage;
    phone: string;
    sendText: (phone: string, text: string) => Promise<void>;
}): Promise<boolean>;
//# sourceMappingURL=compatibility-lookup.service.d.ts.map