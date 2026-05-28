import type { AdvisoryLanguage } from '../../ai/types.js';
type PriceRow = {
    market_name: string;
    district?: string | null;
    price_per_kg: number;
    last_year_price_per_kg?: number | null;
};
export declare const dailyPricesService: {
    formatForFarmer(farmerId: string, language: AdvisoryLanguage): Promise<string>;
    formatRows(language: AdvisoryLanguage, crop: string, date: string, rows: PriceRow[]): string;
};
export {};
//# sourceMappingURL=daily-prices.service.d.ts.map