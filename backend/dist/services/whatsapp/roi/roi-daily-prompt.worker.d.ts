export declare function startRoiDailyPromptWorker(): void;
/** Manual / admin trigger — bypasses once-per-day worker guard. */
export declare function runRoiDailyPromptsNow(options?: {
    farmerId?: string;
    dryRun?: boolean;
}): Promise<{
    sent: number;
    skipped: number;
    failed: number;
}>;
//# sourceMappingURL=roi-daily-prompt.worker.d.ts.map