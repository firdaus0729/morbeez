import { broadcastEngineService } from './broadcast-engine.service.js';
export declare function startWhatsAppBroadcastWorker(): void;
/** For admin manual trigger — bypasses daily window guard. */
export declare function runBroadcastsNow(options?: Parameters<typeof broadcastEngineService.runDailyBroadcasts>[0]): Promise<import("./broadcast-engine.service.js").BroadcastRunResult>;
//# sourceMappingURL=whatsapp-broadcast.worker.d.ts.map