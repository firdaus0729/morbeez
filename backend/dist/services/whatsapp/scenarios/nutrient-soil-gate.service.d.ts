import type { StructuredAdvisory, AdvisoryLanguage } from '../../ai/types.js';
import type { SessionContext } from './session-context.types.js';
export declare function suggestsNutrientDeficiency(advisory: StructuredAdvisory): boolean;
export declare function soilGatePreface(language: AdvisoryLanguage): string;
export declare const nutrientSoilGateService: {
    suggestsNutrientDeficiency: typeof suggestsNutrientDeficiency;
    storePending(farmerId: string, payload: {
        sessionId: string;
        advisory: StructuredAdvisory;
    }): Promise<void>;
    clearPending(farmerId: string): Promise<void>;
    getPending(farmerId: string): Promise<SessionContext["pendingNutrientAdvisory"] | null>;
    markSoilReportReceived(farmerId: string): Promise<void>;
    shouldGateBeforeFertilizerAdvice(farmerId: string, advisory: StructuredAdvisory): Promise<boolean>;
    deliverPending(params: {
        farmerId: string;
        phone: string;
        language: AdvisoryLanguage;
        sendText: (phone: string, text: string) => Promise<void>;
        extraFooter?: string;
    }): Promise<{
        delivered: boolean;
        summary: string;
        sessionId: string;
        advisory: StructuredAdvisory;
    } | null>;
};
//# sourceMappingURL=nutrient-soil-gate.service.d.ts.map