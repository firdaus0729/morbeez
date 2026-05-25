export interface FarmerInput {
    phone: string;
    name?: string;
    preferredLanguage?: string;
    district?: string;
    state?: string;
    shopifyCustomerId?: string;
    source?: string;
}
export interface FarmerCropInput {
    cropType: string;
    acreage?: number;
    stage?: string;
    isPrimary?: boolean;
}
export declare const farmerService: {
    upsertByPhone(input: FarmerInput): Promise<any>;
    upsertFromShopifyCustomer(input: {
        shopifyCustomerId: string;
        phone: string;
        name?: string;
    }): Promise<any>;
    getById(id: string): Promise<any>;
    addCrop(farmerId: string, crop: FarmerCropInput): Promise<any>;
    logInteraction(farmerId: string, channel: string, direction: "inbound" | "outbound", content: string, metadata?: Record<string, unknown>): Promise<void>;
};
//# sourceMappingURL=farmer.service.d.ts.map