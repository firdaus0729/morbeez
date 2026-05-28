export declare const payrollGeneratorService: {
    generateCycle(year: number, month: number, actorId?: string): Promise<any>;
    publishPayrollEntry(payrollEntryId: string, actorId?: string): Promise<any>;
    deliverPayout(payrollEntryId: string, channels: Array<"whatsapp" | "email" | "dashboard">): Promise<{
        ok: boolean;
    }>;
};
//# sourceMappingURL=payroll-generator.service.d.ts.map