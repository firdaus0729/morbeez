export declare const localPracticesService: {
    recordFromFeedback(params: {
        feedbackId: string;
        farmerId: string;
        sessionId: string | null;
        cropType: string;
        district: string | null;
        pincode?: string | null;
        village?: string | null;
        problemLabel: string;
        farmerPractice: string;
        outcome?: string | null;
        verifiedBy: string;
    }): Promise<void>;
    listForCropDistrict(cropType: string, district: string | null, limit?: number): Promise<{
        problem_label: any;
        farmer_practice: any;
        outcome: any;
        district: any;
        created_at: any;
    }[]>;
    hintsForDiagnosis(farmerId: string, cropType: string): Promise<string | null>;
};
//# sourceMappingURL=local-practices.service.d.ts.map