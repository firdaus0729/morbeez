/** Standard soil lab panel — stored in crm_soil_reports.metrics */
export type SoilMetricValue = {
    value: string;
    unit: string;
};
export declare const SOIL_TYPE_OPTIONS: readonly ["Sandy", "Loamy", "Clay", "Laterite/Red Soil", "Black Soil"];
export type SoilTypeOption = (typeof SOIL_TYPE_OPTIONS)[number];
export type SoilLabMetrics = {
    version: 2;
    soilType?: string;
    macro: Record<string, SoilMetricValue>;
    micro: Record<string, SoilMetricValue>;
};
export type SoilFieldDef = {
    key: string;
    label: string;
    unit: string;
    group: 'macro' | 'micro';
};
export declare const SOIL_MACRO_FIELDS: SoilFieldDef[];
export declare const SOIL_MICRO_FIELDS: SoilFieldDef[];
export declare const ALL_SOIL_FIELDS: SoilFieldDef[];
export declare function emptySoilLabMetrics(): SoilLabMetrics;
export declare function normalizeSoilMetrics(raw: unknown): SoilLabMetrics;
export declare function buildMetricsFromForm(macro: Record<string, string>, micro: Record<string, string>, soilType?: string): SoilLabMetrics;
export declare function metricsToForm(metrics: SoilLabMetrics): {
    macro: Record<string, string>;
    micro: Record<string, string>;
    soilType: string;
};
/** Parse comma-separated numbers for WhatsApp (macro: 9 values, micro: 5). */
export declare function parseCommaValues(text: string, expected: number): string[] | null;
export declare function applyMacroValues(metrics: SoilLabMetrics, values: string[]): SoilLabMetrics;
export declare function applyMicroValues(metrics: SoilLabMetrics, values: string[]): SoilLabMetrics;
export declare function formatMetricLine(_f: SoilFieldDef, m: SoilMetricValue | undefined): string;
export declare function formatSoilSummary(metrics: SoilLabMetrics, maxLines?: number): string;
export declare function macroPrompt(lang: string): string;
export declare function microPrompt(lang: string): string;
export declare function soilTypePrompt(lang: string): string;
export declare function parseSoilType(text: string): string | null;
export declare function hasAnyMetricValue(metrics: SoilLabMetrics): boolean;
//# sourceMappingURL=soil-lab-metrics.d.ts.map