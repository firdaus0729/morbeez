import type { AdvisoryLanguage } from '../../ai/types.js';
export type ComposeFarmerReplyInput = {
    body: string;
    validationQuestion?: string | null;
    footer?: string | null;
    maxChars?: number;
};
/** Farmer-facing WhatsApp copy: short blocks, optional single validation question. */
export declare const responseComposerService: {
    compose(input: ComposeFarmerReplyInput): string;
    /** Pull first sentence ending with ? from text if no explicit question provided. */
    extractValidationQuestion(text: string): string | null;
    advisoryDisclaimer(language: AdvisoryLanguage): string;
};
//# sourceMappingURL=response-composer.service.d.ts.map