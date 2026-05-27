import type { AdvisoryLanguage } from '../../ai/types.js';
export type BroadcastKind = 'cultivation_schedule' | 'fertigation_reminder' | 'pgr_broadcast' | 'dap_task' | 'cultivation_knowledge';
type Params = {
    crop: string;
    dap?: number;
    district?: string;
};
export declare function formatBroadcastMessage(kind: BroadcastKind, language: AdvisoryLanguage, params: Params): string;
export {};
//# sourceMappingURL=broadcast-copy.d.ts.map