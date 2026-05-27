/** Minimal context for OpenAI — avoids sending full chat history (token cost). */
export declare function fetchCompactFarmerContext(farmerId: string, options?: {
    activePlotId?: string | null;
}): Promise<{
    cropType: string;
    cropStage?: string;
    recentIssues: string;
    lastSpray?: string;
    activePlotId?: string;
}>;
export declare function formatCompactHistory(ctx: {
    recentIssues: string;
    lastSpray?: string;
}): string;
//# sourceMappingURL=advisory-context.service.d.ts.map