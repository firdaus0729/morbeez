export declare const fieldPwaService: {
    searchFarmers(q: string, limit?: number): Promise<{
        id: any;
        phone: any;
        name: string;
        district: any;
        village: any;
        preferredLanguage: any;
    }[]>;
    getFarmerBlocks(farmerId: string): Promise<{
        id: string;
        name: string;
        cropType: string;
        plotLabel: string | null;
        dap: number;
        plantingDate: string | null;
    }[]>;
    getQuestionnaire(cropType: string): Promise<{
        id: any;
        questionKey: any;
        labelEn: any;
        labelMl: any;
        inputType: any;
        options: string[];
        required: any;
        sortOrder: any;
    }[]>;
    submitVisit(input: {
        farmerId: string;
        blockId: string;
        blockName: string;
        cropType: string;
        leadId?: string;
        agronomistName: string;
        agronomistEmail: string;
        observations?: string;
        diseasePest?: string;
        diseaseTone?: "healthy" | "warning" | "danger";
        actionTaken?: string;
        answers: Array<{
            questionKey: string;
            label: string;
            value: string;
        }>;
        photos?: Array<{
            filename: string;
            mimeType: string;
            dataBase64: string;
        }>;
    }): Promise<{
        finding: {
            id: unknown;
            visitedAt: unknown;
            visitedLabel: string | null;
            blockName: unknown;
            cropType: unknown;
            agronomistName: unknown;
            agronomistRole: unknown;
            agronomistInitials: string;
            observations: unknown;
            parameters: {
                label: string;
                value: string;
            }[];
            diseasePest: unknown;
            diseaseTone: unknown;
            actionTaken: unknown;
            followUpLabel: string | null;
            photoUrls: string[];
            photoCount: number;
        };
        photoUrls: string[];
    }>;
    listRecentVisits(_agronomistEmail: string, limit?: number): Promise<{
        id: any;
        farmer_id: any;
        block_name: any;
        crop_type: any;
        disease_pest: any;
        visited_at: any;
        photo_urls: any;
        farmers: {
            name: any;
            phone: any;
        }[];
    }[]>;
};
//# sourceMappingURL=field-pwa.service.d.ts.map