export type ContextPack = {
    district?: string;
    weatherRiskScore: number;
    heavyRainLikely: boolean;
    highHeatLikely: boolean;
    soilPh?: number;
    soilEc?: number;
    drainageRisk: 'low' | 'moderate' | 'high';
};
export declare const contextPackService: {
    build(farmerId: string): Promise<ContextPack>;
};
//# sourceMappingURL=context-pack.service.d.ts.map