import type { AdvisoryLanguage } from '../../ai/types.js';
import { type BroadcastKind } from './broadcast-copy.js';
export interface BroadcastRule {
    id: string;
    crop_type: string;
    broadcast_kind: BroadcastKind;
    target_dap: number | null;
    dap_tolerance: number;
    min_dap: number | null;
    max_dap: number | null;
    weekday: number | null;
    priority: number;
}
export interface BroadcastRunResult {
    farmersScanned: number;
    sent: number;
    skipped: number;
    failed: number;
    errors: string[];
}
interface FarmerTarget {
    id: string;
    phone: string;
    language: AdvisoryLanguage;
    district?: string | null;
}
interface CropRow {
    crop_type: string;
    planted_at: string | null;
    created_at: string;
    is_primary: boolean | null;
}
export declare const broadcastEngineService: {
    loadActiveRules(): Promise<BroadcastRule[]>;
    matchRulesForFarmer(rules: BroadcastRule[], crops: CropRow[], isoWeekday: number): Array<{
        rule: BroadcastRule;
        crop: CropRow;
        dap: number;
    }>;
    /** Scenario 26 — prepend severe weather line when heavy rain expected. */
    maybeMergeWeatherAlert(farmerId: string, language: AdvisoryLanguage, body: string): Promise<string>;
    sendToFarmer(params: {
        farmer: FarmerTarget;
        rule: BroadcastRule;
        crop: CropRow;
        dap: number;
        dryRun?: boolean;
        mergeWeather?: boolean;
    }): Promise<"sent" | "skipped" | "failed">;
    runDailyBroadcasts(options?: {
        farmerId?: string;
        dryRun?: boolean;
        kinds?: BroadcastKind[];
    }): Promise<BroadcastRunResult>;
};
export {};
//# sourceMappingURL=broadcast-engine.service.d.ts.map