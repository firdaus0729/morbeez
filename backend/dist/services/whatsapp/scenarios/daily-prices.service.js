import { supabase } from '../../../lib/supabase.js';
import { t } from './whatsapp-flow-copy.js';
import { fetchCompactFarmerContext } from '../pipeline/advisory-context.service.js';
export const dailyPricesService = {
    async formatForFarmer(farmerId, language) {
        const ctx = await fetchCompactFarmerContext(farmerId);
        const crop = ctx.cropType.toLowerCase();
        const today = new Date().toISOString().slice(0, 10);
        const { data: rows } = await supabase
            .from('crop_daily_prices')
            .select('market_name, district, price_per_kg, last_year_price_per_kg')
            .eq('crop_type', crop)
            .eq('price_date', today)
            .eq('active', true)
            .order('market_name');
        if (!rows?.length) {
            const { data: fallback } = await supabase
                .from('crop_daily_prices')
                .select('market_name, price_per_kg, last_year_price_per_kg, price_date')
                .eq('crop_type', crop)
                .eq('active', true)
                .order('price_date', { ascending: false })
                .limit(5);
            if (!fallback?.length) {
                return `${t('pricesIntro', language)}\n\nNo prices published yet for ${crop}. Our team will update soon.`;
            }
            return this.formatRows(language, crop, fallback[0].price_date, fallback);
        }
        return this.formatRows(language, crop, today, rows);
    },
    formatRows(language, crop, date, rows) {
        const lines = [`${t('pricesIntro', language)}`, `🌱 ${crop.charAt(0).toUpperCase() + crop.slice(1)} — ${date}`, ''];
        for (const r of rows) {
            let line = `• ${r.market_name} → ₹${Number(r.price_per_kg).toFixed(0)}/kg`;
            if (r.last_year_price_per_kg != null) {
                line += `\n  Same day last year: ₹${Number(r.last_year_price_per_kg).toFixed(0)}/kg`;
            }
            lines.push(line);
        }
        return lines.join('\n');
    },
};
//# sourceMappingURL=daily-prices.service.js.map