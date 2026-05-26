import type { AdvisoryLanguage } from '../../ai/types.js';
import type { InboundMessage } from './types.js';
export declare const whatsappInboundPipeline: {
    process(msg: InboundMessage, sendText: (phone: string, text: string) => Promise<void>, hooks?: {
        sendWelcomeTemplate?: (phone: string, farmerId: string, profileName?: string) => Promise<boolean>;
    }): Promise<void>;
    processVoice(msg: InboundMessage, captured: {
        farmerId: string;
        phone: string;
        language: AdvisoryLanguage;
        isPremium: boolean;
    }, sendText: (phone: string, text: string) => Promise<void>): Promise<void>;
    processImage(msg: InboundMessage, captured: {
        farmerId: string;
        phone: string;
        language: AdvisoryLanguage;
        isPremium: boolean;
    }, sendText: (phone: string, text: string) => Promise<void>): Promise<void>;
    processText(msg: InboundMessage, captured: {
        farmerId: string;
        phone: string;
        language: AdvisoryLanguage;
        isPremium: boolean;
    }, sendText: (phone: string, text: string) => Promise<void>): Promise<void>;
    runDiagnosis(params: {
        farmerId: string;
        phone: string;
        language: AdvisoryLanguage;
        symptomsText?: string;
        voiceTranscript?: string;
        imageBase64?: string;
        imageMimeType?: string;
        sendText: (phone: string, text: string) => Promise<void>;
    }): Promise<void>;
};
//# sourceMappingURL=whatsapp-inbound.pipeline.d.ts.map