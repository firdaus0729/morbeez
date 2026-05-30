export type MappingTab = 'crop' | 'pest' | 'disease' | 'symptom' | 'usage';
export interface MappingListQuery {
    tab?: MappingTab;
    page?: number;
    limit?: number;
    search?: string;
    filter?: 'mapped' | 'unmapped' | '';
}
export declare const aiMappingAdminService: {
    list(query: MappingListQuery): Promise<{
        tab: MappingTab;
        rows: {
            productId: string;
            productName: string;
            imageUrl: string;
            mapped: string[];
            mappedDisplay: "tags" | "empty" | "all";
            mappedTags: string[] | never[];
            mappedCount: number;
            allCropsLabel: string | null;
            isPreview: boolean;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    updateCropMapping(shopifyProductId: string, crops: string[], adminId?: string): Promise<{
        shopifyProductId: unknown;
        basic: Record<string, unknown>;
        agriculture: Record<string, unknown>;
        aiMapping: Record<string, unknown>;
        seo: Record<string, unknown>;
        crossSell: Record<string, unknown>;
        updatedAt: unknown;
    }>;
    updatePestMapping(shopifyProductId: string, pests: string[], adminId?: string): Promise<{
        shopifyProductId: unknown;
        basic: Record<string, unknown>;
        agriculture: Record<string, unknown>;
        aiMapping: Record<string, unknown>;
        seo: Record<string, unknown>;
        crossSell: Record<string, unknown>;
        updatedAt: unknown;
    }>;
    updateDiseaseMapping(shopifyProductId: string, diseases: string[], adminId?: string): Promise<{
        shopifyProductId: unknown;
        basic: Record<string, unknown>;
        agriculture: Record<string, unknown>;
        aiMapping: Record<string, unknown>;
        seo: Record<string, unknown>;
        crossSell: Record<string, unknown>;
        updatedAt: unknown;
    }>;
    updateSymptomMapping(shopifyProductId: string, symptoms: string[], adminId?: string): Promise<{
        shopifyProductId: unknown;
        basic: Record<string, unknown>;
        agriculture: Record<string, unknown>;
        aiMapping: Record<string, unknown>;
        seo: Record<string, unknown>;
        crossSell: Record<string, unknown>;
        updatedAt: unknown;
    }>;
    updateListMapping(shopifyProductId: string, tab: "crop" | "pest" | "disease" | "symptom", items: string[], adminId?: string): Promise<{
        shopifyProductId: unknown;
        basic: Record<string, unknown>;
        agriculture: Record<string, unknown>;
        aiMapping: Record<string, unknown>;
        seo: Record<string, unknown>;
        crossSell: Record<string, unknown>;
        updatedAt: unknown;
    }>;
    listProductOptions(search?: string): Promise<{
        id: string;
        title: string;
    }[]>;
};
//# sourceMappingURL=ai-mapping-admin.service.d.ts.map