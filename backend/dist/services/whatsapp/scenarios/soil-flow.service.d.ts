import type { AdvisoryLanguage } from '../../ai/types.js';
type SoilMenuList = {
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
};
/** Scenarios 12–14, 43 — soil testing flows. */
export declare const soilFlowService: {
    soilMenuList(language: AdvisoryLanguage): SoilMenuList;
    hasSoilReport(farmerId: string): Promise<boolean>;
    handleLowYieldWithoutReport(_farmerId: string, language: AdvisoryLanguage): Promise<{
        body: string;
        list: SoilMenuList;
    }>;
    addressReply(language: AdvisoryLanguage): string;
    requestSoilTesting(farmerId: string, language: AdvisoryLanguage): Promise<string>;
    reportReceivedReply(language: AdvisoryLanguage): string;
};
export {};
//# sourceMappingURL=soil-flow.service.d.ts.map