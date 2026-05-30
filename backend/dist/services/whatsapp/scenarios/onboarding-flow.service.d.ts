import type { AdvisoryLanguage } from '../../ai/types.js';
/** Whether farmer finished language → acre → plot → planting date. */
export declare const onboardingFlowService: {
    isComplete(farmerId: string): Promise<boolean>;
    markComplete(farmerId: string): Promise<void>;
    currentStepPrompt(step: string | undefined, lang: AdvisoryLanguage): string;
};
export declare function plantingDatePrompt(lang: AdvisoryLanguage): string;
export declare function pincodePrompt(lang: AdvisoryLanguage): string;
export declare function invalidPincodeReply(lang: AdvisoryLanguage): string;
export declare function pincodeSavedReply(lang: AdvisoryLanguage, district: string, state: string): string;
export declare function parsePincodeInput(text: string): string | null;
//# sourceMappingURL=onboarding-flow.service.d.ts.map