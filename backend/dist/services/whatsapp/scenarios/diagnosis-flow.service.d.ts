import type { StructuredAdvisory } from '../../ai/types.js';
import type { AdvisoryLanguage } from '../../ai/types.js';
export declare const diagnosisFlowService: {
    recordImageReceived(farmerId: string): Promise<{
        imageCount: number;
        shouldRunDiagnosis: boolean;
    }>;
    firstImagePrompt(language: AdvisoryLanguage): string;
    analyzingPrompt(language: AdvisoryLanguage): string;
    storeDiagnosisResult(farmerId: string, sessionId: string, advisory: StructuredAdvisory, summary: string): Promise<void>;
    waterVolumeList(language: AdvisoryLanguage): {
        body: string;
        buttonText: string;
        sections: {
            title: string;
            rows: {
                id: string;
                title: string;
                description: string;
            }[];
        }[];
    };
    formatQuantityReply(farmerId: string, language: AdvisoryLanguage, waterLiters: number): Promise<string>;
    technicalOnlyReply(advisory: StructuredAdvisory, language: AdvisoryLanguage): string;
    productUnavailableReply(language: AdvisoryLanguage): string;
    lowConfidenceReply(language: AdvisoryLanguage): string;
    rootPhotosReply(language: AdvisoryLanguage): string;
    duplicateImageReply(language: AdvisoryLanguage, previousSummary?: string): string;
    parseWaterLiters(text: string): number | null;
};
//# sourceMappingURL=diagnosis-flow.service.d.ts.map