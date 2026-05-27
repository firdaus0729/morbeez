import type { AdvisoryLanguage } from '../../ai/types.js';
export type CultivationOutcome = 'better' | 'partial' | 'no_improvement';
export declare const cultivationLoggingService: {
    logActivity(params: {
        farmerId: string;
        activityType?: "spray_applied" | "fertigation" | "drench" | "scouting" | "other";
        appliedAt?: string;
        cropType?: string;
        cropStage?: string;
        dosageNotes?: string;
        products?: unknown[];
        notes?: string;
        advisorySessionId?: string;
        commerceOrderId?: string;
        farmerCropId?: string;
        source?: string;
    }): Promise<{
        id: string;
    }>;
    scheduleApplicationPrompt(params: {
        farmerId: string;
        daysFromNow?: number;
        advisorySessionId?: string;
        commerceOrderId?: string;
        language?: AdvisoryLanguage;
    }): Promise<void>;
    scheduleResultValidation(params: {
        farmerId: string;
        activityId: string;
        daysFromNow?: number;
        language?: AdvisoryLanguage;
    }): Promise<void>;
    sendApplicationPrompt(phone: string, farmerId: string, lang: AdvisoryLanguage): Promise<void>;
    sendResultValidationPrompt(phone: string, farmerId: string, lang: AdvisoryLanguage, activityId: string): Promise<void>;
    handleApplied(farmerId: string, _phone: string, lang: AdvisoryLanguage): Promise<string>;
    handleNotYet(farmerId: string, lang: AdvisoryLanguage): Promise<string>;
    handleOutcome(farmerId: string, phone: string, lang: AdvisoryLanguage, outcome: CultivationOutcome | "agronomist"): Promise<string>;
    escalateNoImprovement(farmerId: string, phone: string, _lang: AdvisoryLanguage, activityId?: string): Promise<void>;
    handleSprayCompletedText(farmerId: string, _phone: string, lang: AdvisoryLanguage, text?: string): Promise<string>;
    isSprayCompletedMessage(text: string): boolean;
    handleInboundAction(params: {
        farmerId: string;
        phone: string;
        language: AdvisoryLanguage;
        action: string;
        text?: string;
    }): Promise<{
        handled: boolean;
        reply?: string;
    }>;
    onAdvisoryCompleted(params: {
        farmerId: string;
        sessionId: string;
        language: AdvisoryLanguage;
        hasProductRecommendations: boolean;
    }): Promise<void>;
    onOrderDispatched(params: {
        farmerId: string;
        commerceOrderId?: string;
        language: AdvisoryLanguage;
    }): Promise<void>;
};
//# sourceMappingURL=cultivation-logging.service.d.ts.map