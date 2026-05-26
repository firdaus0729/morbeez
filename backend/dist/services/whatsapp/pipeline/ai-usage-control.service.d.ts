export type UsageKind = 'text' | 'image' | 'voice';
export type UsageCheckResult = {
    allowed: true;
} | {
    allowed: false;
    reason: 'rate_limit' | 'daily_text' | 'daily_image' | 'daily_voice' | 'voice_too_long';
};
export declare const aiUsageControlService: {
    checkAndConsume(params: {
        farmerId: string;
        kind: UsageKind;
        isPremium?: boolean;
        voiceDurationSec?: number;
    }): Promise<UsageCheckResult>;
    recordBlocked(farmerId: string): Promise<void>;
    usageLimitMessage(language: string, reason: "rate_limit" | "daily_text" | "daily_image" | "daily_voice" | "voice_too_long"): string;
};
//# sourceMappingURL=ai-usage-control.service.d.ts.map