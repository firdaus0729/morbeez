/**
 * Morbeez verified Calcium Nitrate tank-mix chart (training source for spray_compatibility_rules).
 * Anchor product is always Calcium Nitrate; pairs are stored in both directions at lookup time.
 */
export declare const CALCIUM_NITRATE_PRODUCT = "Calcium Nitrate";
export type TankMixRule = {
    product: string;
    compatible: boolean;
    notes?: string;
    /** Extra tokens that match farmer / label wording */
    aliases: string[];
};
/** Normalized tokens → canonical product label for matching */
export declare const PRODUCT_ALIASES: Record<string, string>;
export declare const CALCIUM_NITRATE_TANK_MIX_RULES: TankMixRule[];
export declare const CALCIUM_NITRATE_MIX_WARNING = "Never mix Calcium Nitrate + Magnesium Sulphate + MKP or Phosphonic Acid in one tank \u2014 causes precipitation and clogging.";
export declare function normalizeTankMixToken(raw: string): string;
export declare function isCalciumNitrateProduct(name: string): boolean;
/** Lookup when one side of the pair is Calcium Nitrate (built-in chart). */
export declare function lookupCalciumNitratePair(productA: string, productB: string): {
    found: boolean;
    productA: string;
    productB: string;
    compatible?: boolean;
    notes?: string;
} | null;
/** Rows for spray_compatibility_rules seed migration */
export declare function calciumNitrateRulesForDb(): Array<{
    product_a: string;
    product_b: string;
    compatible: boolean;
    notes: string | null;
}>;
//# sourceMappingURL=calcium-nitrate-tank-mix.knowledge.d.ts.map