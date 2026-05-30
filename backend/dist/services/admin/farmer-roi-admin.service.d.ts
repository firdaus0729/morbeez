export type RoiEntryType = 'labour' | 'purchase' | 'misc' | 'harvest' | 'income';
export type RoiEntryRow = {
    id: string;
    entryDate: string;
    category: string;
    comments: string | null;
    debitInr: number | null;
    creditInr: number | null;
    amountInr: number;
    staffEditUsed: boolean;
    staffEditedAt: string | null;
    staffEditedBy: string | null;
    createdAt: string;
};
export declare const farmerRoiAdminService: {
    listEntries(farmerId: string, limit?: number): Promise<{
        entries: RoiEntryRow[];
        summary: {
            debits: number;
            credits: number;
            balance: number;
        };
    }>;
    staffEditEntry(params: {
        farmerId: string;
        entryId: string;
        staffEmail: string;
        password: string;
        patch: {
            entryDate?: string;
            category?: RoiEntryType;
            comments?: string | null;
            debitInr?: number | null;
            creditInr?: number | null;
        };
    }): Promise<RoiEntryRow>;
};
//# sourceMappingURL=farmer-roi-admin.service.d.ts.map