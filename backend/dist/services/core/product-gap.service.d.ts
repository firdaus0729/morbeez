export declare const productGapService: {
    incrementFromRecommendation(params: {
        technicalName: string;
        cropType?: string;
        cropSubtype?: string;
        district?: string | null;
        recommendationRecordId?: string;
    }): Promise<void>;
    listOpen(limit?: number): Promise<any[]>;
};
//# sourceMappingURL=product-gap.service.d.ts.map