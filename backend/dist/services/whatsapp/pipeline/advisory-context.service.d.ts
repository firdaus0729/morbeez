/** Minimal context for OpenAI — avoids sending full chat history (token cost). */
export declare function fetchCompactFarmerContext(farmerId: string, options?: {
    activePlotId?: string | null;
    activeBlockId?: string | null;
}): Promise<{
    cropType: string;
    cropStage?: string;
    recentIssues: string;
    lastSpray?: string;
    activePlotId?: string;
    activeBlockId?: string;
    dap?: number;
}>;
export declare function formatCompactHistory(ctx: {
    recentIssues: string;
    lastSpray?: string;
    dap?: number;
}): string;
//# sourceMappingURL=advisory-context.service.d.ts.map