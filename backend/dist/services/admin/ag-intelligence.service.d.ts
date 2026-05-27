export declare const agIntelligenceService: {
    listWeatherRules(params?: {
        status?: string;
        cropType?: string;
    }): Promise<any[]>;
    upsertWeatherRule(row: {
        id?: string;
        ruleKey: string;
        version?: number;
        cropType?: string | null;
        conditionJson?: Record<string, unknown>;
        actionType: string;
        actionPayload?: Record<string, unknown>;
        priority?: number;
        status?: string;
        notes?: string;
        approvedBy?: string;
    }): Promise<any>;
    listCultivationTasks(cropType?: string): Promise<any[]>;
    upsertCultivationTask(row: {
        id?: string;
        cropType: string;
        taskKey: string;
        titleEn: string;
        titleMl?: string;
        instructionsEn?: string;
        instructionsMl?: string;
        targetDapMin?: number | null;
        targetDapMax?: number | null;
        growthStage?: string;
        priority?: number;
        active?: boolean;
    }): Promise<any>;
    listRecommendationTemplates(params?: {
        status?: string;
        cropType?: string;
    }): Promise<any[]>;
    upsertRecommendationTemplate(row: {
        id?: string;
        cropType: string;
        issueKey: string;
        issueLabelEn?: string;
        recommendationTextEn: string;
        recommendationTextMl?: string;
        products?: unknown[];
        applicationType?: string;
        status?: string;
        approvedBy?: string;
    }): Promise<any>;
    listSprayCompatibility(): Promise<any[]>;
    upsertSprayCompatibility(row: {
        id?: string;
        productA: string;
        productB: string;
        compatible: boolean;
        minIntervalHours?: number | null;
        notes?: string;
        active?: boolean;
    }): Promise<any>;
    listResistanceRotation(cropType?: string): Promise<any[]>;
    upsertResistanceRotation(row: {
        id?: string;
        cropType: string;
        modeOfAction: string;
        rotationOrder: number;
        technicalName: string;
        notes?: string;
        active?: boolean;
    }): Promise<any>;
    deleteRow(table: string, id: string): Promise<void>;
};
//# sourceMappingURL=ag-intelligence.service.d.ts.map