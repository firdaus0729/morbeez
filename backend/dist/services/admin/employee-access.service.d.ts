export declare const employeeAccessService: {
    createSetupToken(input: {
        employeeProfileId: string;
        purpose: "setup_password" | "reset_password" | "email_invite";
        createdBy?: string;
        channels: string[];
    }): Promise<{
        token: string;
        expiresAt: string;
    }>;
    consumeToken(input: {
        token: string;
        password: string;
    }): Promise<{
        ok: boolean;
    }>;
};
//# sourceMappingURL=employee-access.service.d.ts.map