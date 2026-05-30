import type { AdvisoryLanguage } from '../../ai/types.js';
/**
 * Agronomy-first reply: verified tank-mix DB → conversational AI with farmer memory.
 * Returns true when a reply was sent.
 */
export declare function tryAgronomyReply(params: {
    farmerId: string;
    phone: string;
    language: AdvisoryLanguage;
    text: string;
    sendText: (phone: string, text: string) => Promise<void>;
    farmerName?: string;
    isPremium?: boolean;
}): Promise<boolean>;
//# sourceMappingURL=agronomy-reply.service.d.ts.map