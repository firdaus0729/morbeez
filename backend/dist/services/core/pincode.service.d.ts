export type PincodeRow = {
    id: string;
    pincode: string;
    village: string | null;
    taluk: string;
    district: string;
    state: string;
    latitude: number | null;
    longitude: number | null;
};
export declare const pincodeService: {
    lookupByPincode(pincode: string): Promise<PincodeRow | null>;
    search(params: {
        district?: string;
        q?: string;
        limit?: number;
    }): Promise<PincodeRow[]>;
    assignFarmerPincode(farmerId: string, pincode: string): Promise<PincodeRow | null>;
};
//# sourceMappingURL=pincode.service.d.ts.map