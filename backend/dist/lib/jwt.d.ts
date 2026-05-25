export interface FarmerTokenPayload {
    sub: string;
    email: string;
    exp: number;
}
export declare function createFarmerToken(farmerId: string, email: string, ttlDays?: number): string;
export declare function verifyFarmerToken(token: string): FarmerTokenPayload;
export declare function getBearerToken(authorization: string | undefined): string | null;
//# sourceMappingURL=jwt.d.ts.map