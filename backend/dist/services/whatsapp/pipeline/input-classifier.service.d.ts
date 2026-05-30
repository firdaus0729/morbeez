export type AgricultureInputCategory = 'disease_stress' | 'insect' | 'weed' | 'root_soil' | 'compatibility' | 'cultivation' | 'unknown_low_conf';
export type ClassificationResult = {
    category: AgricultureInputCategory;
    confidence: number;
    signals: string[];
};
export type VisionClassificationInput = {
    category: AgricultureInputCategory;
    confidence: number;
    photoQuality?: 'ok' | 'blurry' | 'too_dark' | 'unknown';
};
/**
 * Rule-based agriculture input classifier (Phase 1).
 * Vision tags can be added in Phase 2 without changing callers.
 */
export declare const inputClassifierService: {
    classifyText(text?: string | null, options?: {
        hasCropMedia?: boolean;
    }): ClassificationResult;
    shouldUsePlaybook(result: ClassificationResult): boolean;
    /** Merge text + vision; vision wins when clearly stronger. */
    mergeWithVision(textResult: ClassificationResult, vision: VisionClassificationInput | null | undefined): ClassificationResult;
};
//# sourceMappingURL=input-classifier.service.d.ts.map