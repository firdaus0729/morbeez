export interface AdminTokenPayload {
    sub: string;
    email: string;
    role: string;
    typ: 'admin';
    exp: number;
}
export declare function createAdminToken(adminId: string, email: string, role: string, ttlHours?: number): string;
export declare function verifyAdminToken(token: string): AdminTokenPayload;
//# sourceMappingURL=admin-jwt.d.ts.map