export declare function buildResetPasswordUrl(token: string): string;
export declare const staffPasswordService: {
    setAdminPassword(adminUserId: string, password: string): Promise<void>;
    /** Self-service forgot password (always returns the same message). */
    requestPasswordReset(email: string): Promise<{
        ok: true;
        message: string;
    }>;
    /** Admin-initiated reset link for an employee profile. */
    createEmployeeResetLink(input: {
        employeeProfileId: string;
        createdBy?: string;
    }): Promise<{
        token: string;
        resetUrl: string;
        expiresAt: string;
        email: any;
    }>;
    previewResetToken(rawToken: string): Promise<{
        email: any;
        fullName: any;
        expiresAt: any;
        source: "forgot_password";
    } | {
        email: any;
        fullName: any;
        expiresAt: any;
        source: "admin_reset";
    }>;
    completePasswordReset(input: {
        token: string;
        password: string;
        confirmPassword: string;
    }): Promise<{
        ok: true;
        email: any;
    }>;
};
//# sourceMappingURL=staff-password.service.d.ts.map