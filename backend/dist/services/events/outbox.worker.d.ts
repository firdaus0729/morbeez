export declare class OutboxWorker {
    private timer;
    start(): void;
    stop(): void;
    processBatch(): Promise<number>;
}
export declare const outboxWorker: OutboxWorker;
/** Skip worker in test */
export declare function startOutboxWorkerIfEnabled(): void;
//# sourceMappingURL=outbox.worker.d.ts.map