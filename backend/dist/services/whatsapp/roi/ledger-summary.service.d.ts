import type { AdvisoryLanguage } from '../../ai/types.js';
export declare const ledgerSummaryService: {
    balanceForFarmer(farmerId: string, fromDate?: string, toDate?: string): Promise<{
        credits: number;
        debits: number;
        balance: number;
        entryCount: number;
    }>;
    formatMonthlyLedger(farmerId: string, language: AdvisoryLanguage, refDate?: Date): Promise<string>;
};
//# sourceMappingURL=ledger-summary.service.d.ts.map