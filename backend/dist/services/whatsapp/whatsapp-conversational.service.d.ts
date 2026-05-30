import type { AdvisoryLanguage } from '../ai/types.js';
import type { FarmerMemorySnapshot } from './pipeline/farmer-memory.service.js';
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
        /** @deprecated use memory */
        conversationHistory?: string[];
        memory?: FarmerMemorySnapshot;
    }): Promise<string>;
};
//# sourceMappingURL=whatsapp-conversational.service.d.ts.map