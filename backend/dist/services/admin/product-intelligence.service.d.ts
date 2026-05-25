declare const SECTIONS: readonly ["basic", "agriculture", "ai_mapping", "seo", "cross_sell"];
export type IntelligenceSection = (typeof SECTIONS)[number];
export declare const productIntelligenceService: {
    get(shopifyProductId: string): Promise<{
        shopifyProductId: unknown;
        basic: Record<string, unknown>;
        agriculture: Record<string, unknown>;
        aiMapping: Record<string, unknown>;
        seo: Record<string, unknown>;
        crossSell: Record<string, unknown>;
        updatedAt: unknown;
    }>;
    upsert(shopifyProductId: string, input: Partial<Record<IntelligenceSection, Record<string, unknown>>>, adminId?: string): Promise<{
        shopifyProductId: unknown;
        basic: Record<string, unknown>;
        agriculture: Record<string, unknown>;
        aiMapping: Record<string, unknown>;
        seo: Record<string, unknown>;
        crossSell: Record<string, unknown>;
        updatedAt: unknown;
    }>;
};
export {};
//# sourceMappingURL=product-intelligence.service.d.ts.map