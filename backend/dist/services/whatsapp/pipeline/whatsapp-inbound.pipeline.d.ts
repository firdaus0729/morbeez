import type { AdvisoryLanguage } from '../../ai/types.js';
import type { InboundMessage } from './types.js';
type Senders = {
    text: (phone: string, text: string) => Promise<void>;
    list?: (params: {
        phone: string;
        header?: string;
        body: string;
        buttonText: string;
        sections: Array<{
            title: string;
            rows: Array<{
                id: string;
                title: string;
                description?: string;
            }>;
        }>;
    }) => Promise<void>;
    buttons?: (params: {
        phone: string;
        body: string;
        buttons: Array<{
            id: string;
            title: string;
        }>;
    }) => Promise<void>;
};
export declare const whatsappInboundPipeline: {
    process(msg: InboundMessage, send: Senders, _hooks?: {
        sendWelcomeTemplate?: (phone: string, farmerId: string, profileName?: string) => Promise<boolean>;
    }): Promise<void>;
    processVoice(msg: InboundMessage, captured: {
        farmerId: string;
        phone: string;
        language: AdvisoryLanguage;
        isPremium: boolean;
    }, sendText: (phone: string, text: string) => Promise<void>, send?: Senders): Promise<void>;
    processImage(msg: InboundMessage, captured: {
        farmerId: string;
        phone: string;
        language: AdvisoryLanguage;
        isPremium: boolean;
    }, sendText: (phone: string, text: string) => Promise<void>, senders?: Senders): Promise<void>;
    processText(msg: InboundMessage, captured: {
        farmerId: string;
        phone: string;
        language: AdvisoryLanguage;
        isPremium: boolean;
    }, sendText: (phone: string, text: string) => Promise<void>): Promise<void>;
    /** OpenAI chat for greetings/help; full Crop Doctor when symptoms are detailed. */
    replyToText(msg: InboundMessage, captured: {
        farmerId: string;
        phone: string;
        language: AdvisoryLanguage;
        isPremium: boolean;
    }, sendText: (phone: string, text: string) => Promise<void>): Promise<void>;
    sendAndLog(farmerId: string, phone: string, text: string, sendText: (phone: string, text: string) => Promise<void>): Promise<void>;
    runDiagnosis(params: {
        farmerId: string;
        phone: string;
        language: AdvisoryLanguage;
        symptomsText?: string;
        voiceTranscript?: string;
        imageBase64?: string;
        imageMimeType?: string;
        channel?: "whatsapp" | "api" | "web";
        sendText: (phone: string, text: string) => Promise<void>;
        send?: Senders;
    }): Promise<void>;
};
export {};
//# sourceMappingURL=whatsapp-inbound.pipeline.d.ts.map