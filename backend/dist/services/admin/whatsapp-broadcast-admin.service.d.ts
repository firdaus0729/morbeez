import type { BroadcastKind } from '../whatsapp/broadcasts/broadcast-copy.js';
export declare const whatsappBroadcastAdminService: {
    listRules(): Promise<any[]>;
    listDeliveries(params: {
        farmerId?: string;
        limit?: number;
    }): Promise<any[]>;
    runBroadcasts(params: {
        farmerId?: string;
        dryRun?: boolean;
        kinds?: BroadcastKind[];
    }): Promise<import("../whatsapp/broadcasts/broadcast-engine.service.js").BroadcastRunResult>;
    upsertRule(row: {
        id?: string;
        cropType: string;
        broadcastKind: BroadcastKind;
        targetDap?: number | null;
        dapTolerance?: number;
        minDap?: number | null;
        maxDap?: number | null;
        weekday?: number | null;
        priority?: number;
        active?: boolean;
    }): Promise<any>;
};
//# sourceMappingURL=whatsapp-broadcast-admin.service.d.ts.map