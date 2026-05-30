import type { AdvisoryLanguage } from '../../ai/types.js';
import { isFarmerDisagreementIntent } from '../../core/farmer-feedback-intent.service.js';
import type { ScenarioSenders } from './whatsapp-scenario-router.service.js';
export type FarmerFeedbackCaptureStep = 'diagnosis' | 'experience_years' | 'experience' | 'product' | 'outcome';
export declare const farmerFeedbackFlowService: {
    isDisagreementIntent: typeof isFarmerDisagreementIntent;
    canStartDisagreement(farmerId: string): Promise<{
        sessionId: string | null;
        aiIssue: string | null;
        aiConfidence: number | null;
    } | null>;
    startFlow(params: {
        farmerId: string;
        phone: string;
        lang: AdvisoryLanguage;
        send: ScenarioSenders;
        initialText?: string;
    }): Promise<void>;
    tryHandleCapture(params: {
        farmerId: string;
        phone: string;
        lang: AdvisoryLanguage;
        text: string;
        send: ScenarioSenders;
    }): Promise<boolean>;
};
//# sourceMappingURL=farmer-feedback-flow.service.d.ts.map