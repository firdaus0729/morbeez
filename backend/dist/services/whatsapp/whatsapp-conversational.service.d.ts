import type { AdvisoryLanguage } from '../ai/types.js';
/**
 * Lightweight OpenAI chat reply for WhatsApp (greetings, general questions).
 * Full crop diagnosis still uses cropDoctorService when symptoms/media warrant it.
 */
export declare const whatsappConversationalService: {
    isEnabled(): boolean;
    generateReply(params: {
        userMessage: string;
        language: AdvisoryLanguage;
        farmerName?: string;
        conversationHistory?: string[];
    }): Promise<string>;
};
//# sourceMappingURL=whatsapp-conversational.service.d.ts.map