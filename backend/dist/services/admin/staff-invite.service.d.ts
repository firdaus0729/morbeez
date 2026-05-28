export declare function getConsolePublicUrl(): string;
export declare function buildInviteUrl(token: string): string;
export declare function assertSharedPasswordConfigured(): string;
export declare function assertSharedPasswordMatches(password: string): void;
export declare const staffInviteService: {
    ensurePendingAdminUser(employeeProfileId: string): Promise<string>;
    createInvite(input: {
        employeeProfileId: string;
        createdBy?: string;
    }): Promise<{
        token: string;
        inviteUrl: string;
        expiresAt: string;
        email: any;
        fullName: any;
        role: any;
    }>;
    previewToken(rawToken: string): Promise<{
        email: any;
        fullName: any;
        role: any;
        expiresAt: any;
        purpose: any;
    }>;
    completeInvite(input: {
        token: string;
        password: string;
    }): Promise<{
        ok: true;
        email: any;
    }>;
};
//# sourceMappingURL=staff-invite.service.d.ts.map