export declare const employeeAccessService: {
    createSetupToken(input: {
        employeeProfileId: string;
        purpose: "setup_password" | "reset_password" | "email_invite";
        createdBy?: string;
        channels: string[];
        expiresInHours?: number;
    }): Promise<{
        token: string;
        expiresAt: string;
    }>;
    consumeToken(input: {
        token: string;
        password: string;
        confirmPassword: string;
    }): Promise<{
        ok: boolean;
    }>;
};
//# sourceMappingURL=employee-access.service.d.ts.map