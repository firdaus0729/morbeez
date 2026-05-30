/**
 * Phase 5 — close the loop: staff-verified knowledge → reuse cache + terminology library.
 */
export declare const learningLoopService: {
    onTerminologyResolved(params: {
        taskId: string;
        term: string;
        language: string;
        meaning: string;
        cropType?: string | null;
        district?: string | null;
        resolvedBy?: string;
        farmerId?: string | null;
    }): Promise<void>;
    promoteRecommendationToReuse(recommendationRecordId: string): Promise<void>;
    onLearningSampleReady(recommendationRecordId: string): Promise<void>;
};
//# sourceMappingURL=learning-loop.service.d.ts.map