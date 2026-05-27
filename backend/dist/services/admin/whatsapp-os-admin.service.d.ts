export declare const whatsappOsAdminService: {
    getConversationSession(farmerId: string): Promise<any>;
    updateConversationSession(farmerId: string, patch: {
        aiPaused?: boolean;
        owner?: "ai" | "telecaller" | "agronomist";
        preferredLanguage?: string | null;
        activePlotId?: string | null;
    }): Promise<any>;
    listCropDailyPrices(cropType?: string): Promise<any[]>;
    upsertCropDailyPrice(row: {
        cropType: string;
        marketName: string;
        district?: string;
        pricePerKg: number;
        lastYearPricePerKg?: number;
        priceDate?: string;
    }): Promise<any>;
    listTerminologyReviewTasks(status?: string): Promise<any[]>;
};
//# sourceMappingURL=whatsapp-os-admin.service.d.ts.map