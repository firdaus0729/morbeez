import type { AdvisoryLanguage } from '../../ai/types.js';
export declare const terminologyService: {
    resolveTerm(term: string, language: AdvisoryLanguage, district?: string | null, cropType?: string | null): Promise<{
        found: boolean;
        meaning?: string;
        confidence: number;
    }>;
    createReviewTask(params: {
        farmerId: string;
        term: string;
        language?: AdvisoryLanguage;
        cropType?: string;
        district?: string;
        contextText?: string;
    }): Promise<void>;
    isChimbIssue(text: string): boolean;
    isLikelyUnknownRegionalPhrase(text: string): boolean;
    chimbQuestionCopy(language: AdvisoryLanguage): string;
    chimbAdviceCopy(language: AdvisoryLanguage): string;
    clarifyCopy(language: AdvisoryLanguage): string;
};
//# sourceMappingURL=terminology.service.d.ts.map