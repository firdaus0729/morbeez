import type { AdvisoryLanguage } from '../../ai/types.js';
/** Whether farmer finished language → acre → plot → planting date. */
export declare const onboardingFlowService: {
    isComplete(farmerId: string): Promise<boolean>;
    markComplete(farmerId: string): Promise<void>;
    currentStepPrompt(step: string | undefined, lang: AdvisoryLanguage): string;
};
export declare function plantingDatePrompt(lang: AdvisoryLanguage): string;
//# sourceMappingURL=onboarding-flow.service.d.ts.map