export type SeasonPhase = 'monsoon' | 'planting' | 'disease_peak' | 'normal';
export type SeasonalPriority = {
    phase: SeasonPhase;
    broadcastPriorityBoost: number;
    preferWeatherAlerts: boolean;
    preferDapAlerts: boolean;
};
/** Kerala-centric seasonal heuristics (IST calendar). */
export declare const seasonalPriorityService: {
    currentPhase(date?: Date): SeasonPhase;
    resolve(date?: Date): SeasonalPriority;
    adjustBroadcastPriority(basePriority: number, date?: Date): number;
};
//# sourceMappingURL=seasonal-priority.service.d.ts.map