import type { AdvisoryLanguage } from '../../ai/types.js';
export declare const returnUserGreetingService: {
    buildSmartGreeting(farmerId: string, language: AdvisoryLanguage): Promise<{
        greeting: string;
        includeTrackOrder: boolean;
        optionsIntro: string;
    } | null>;
};
//# sourceMappingURL=return-user-greeting.service.d.ts.map