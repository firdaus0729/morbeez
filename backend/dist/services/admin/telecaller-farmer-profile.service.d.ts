export type CropBlockInput = {
    id?: string;
    blockName?: string;
    cropName: string;
    acreage?: number;
    plantingDate?: string;
};
export type FarmerProfileInput = {
    name?: string;
    phone?: string;
    whatsappSame?: boolean;
    whatsappPhone?: string;
    language?: string;
    pincode?: string;
    village?: string;
    totalAcreage?: number;
    shippingAddress?: string;
    deliveryPincode?: string;
    assignedCropAdvisor?: string;
    roiEnabled?: boolean;
    farmerNotes?: string;
    cropExperienceYears?: number;
    cropBlocks?: CropBlockInput[];
};
export declare const telecallerFarmerProfileService: {
    getProfile(farmerId: string): Promise<{
        profile: {
            id: string;
            name: string | null;
            phone: string | null;
            whatsappSame: boolean;
            whatsappPhone: string | null;
            language: string;
            pincode: string | null;
            district: string | null;
            state: string | null;
            village: string | null;
            totalAcreage: number | null;
            shippingAddress: string | null;
            deliveryPincode: string | null;
            assignedCropAdvisor: string | null;
            roiEnabled: boolean;
            farmerNotes: string | null;
            cropExperienceYears: number | null;
            metadata: Record<string, unknown>;
        };
        cropBlocks: {
            id: unknown;
            blockName: unknown;
            cropName: {};
            acreage: {};
            plantingDate: string | null;
            daysAfterPlanting: number | null;
        }[];
    }>;
    updateProfile(farmerId: string, input: FarmerProfileInput): Promise<{
        profile: {
            id: string;
            name: string | null;
            phone: string | null;
            whatsappSame: boolean;
            whatsappPhone: string | null;
            language: string;
            pincode: string | null;
            district: string | null;
            state: string | null;
            village: string | null;
            totalAcreage: number | null;
            shippingAddress: string | null;
            deliveryPincode: string | null;
            assignedCropAdvisor: string | null;
            roiEnabled: boolean;
            farmerNotes: string | null;
            cropExperienceYears: number | null;
            metadata: Record<string, unknown>;
        };
        cropBlocks: {
            id: unknown;
            blockName: unknown;
            cropName: {};
            acreage: {};
            plantingDate: string | null;
            daysAfterPlanting: number | null;
        }[];
    }>;
    applyProfileOnCreate(farmerId: string, input: FarmerProfileInput): Promise<void>;
};
//# sourceMappingURL=telecaller-farmer-profile.service.d.ts.map