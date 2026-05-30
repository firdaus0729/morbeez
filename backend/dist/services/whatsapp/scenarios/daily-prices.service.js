import { env } from '../../../config/env.js';
import { openaiTokenLimitBody } from '../../ai/providers/openai-chat-params.js';
import { logger } from '../../../lib/logger.js';
import { supabase } from '../../../lib/supabase.js';
import { t } from './whatsapp-flow-copy.js';
import { fetchCompactFarmerContext } from '../pipeline/advisory-context.service.js';
const OPENAI_BASE = 'https://api.openai.com/v1/chat/completions';
async function fetchPriceRows(crop, today) {
    const { data: rows } = await supabase
        .from('crop_daily_prices')
        .select('market_name, district, price_per_kg, last_year_price_per_kg')
        .eq('crop_type', crop)
        .eq('price_date', today)
        .eq('active', true)
        .order('market_name');
    if (rows?.length)
        return { date: today, rows };
    const { data: fallback } = await supabase
        .from('crop_daily_prices')
        .select('market_name, price_per_kg, last_year_price_per_kg, price_date')
        .eq('crop_type', crop)
        .eq('active', true)
        .order('price_date', { ascending: false })
        .limit(5);
    if (!fallback?.length)
        return { date: today, rows: [] };
    return { date: fallback[0].price_date, rows: fallback };
}
function priceFacts(crop, date, rows) {
    if (!rows.length)
        return `No published prices for ${crop} on ${date}.`;
    return rows
        .map((r) => {
        let line = `${r.market_name}: ₹${Number(r.price_per_kg).toFixed(0)}/kg`;
        if (r.last_year_price_per_kg != null) {
            line += ` (last year same day: ₹${Number(r.last_year_price_per_kg).toFixed(0)}/kg)`;
        }
        return line;
    })
        .join('\n');
}
async function composeWithOpenAi(params) {
    if (!env.OPENAI_API_KEY?.trim())
        return null;
    const crop = params.cropType.charAt(0).toUpperCase() + params.cropType.slice(1);
    const langNames = {
        en: 'English',
        ml: 'Malayalam',
        ta: 'Tamil',
        kn: 'Kannada',
        hi: 'Hindi',
    };
    const system = `You are Morbeez Crop Doctor on WhatsApp.
Write a short, farmer-friendly market price update using ONLY the price facts provided.
Rules:
- Reply entirely in ${langNames[params.language]}.
- Max 520 characters.
- Sound human and practical for a farmer selling or planning sale.
- Mention crop and date once.
- Highlight trend vs last year when data exists.
- Do NOT invent prices; use only provided values.
- No markdown headings or bullet dumps.`;
    const user = `Crop: ${crop}
Date: ${params.date}
District: ${params.district ?? 'Wayanad region'}
${params.dap && params.dap > 0 ? `DAP: ${params.dap}` : ''}
${params.cropStage ? `Stage: ${params.cropStage}` : ''}

Market price facts:
${priceFacts(params.cropType, params.date, params.rows)}`;
    try {
        const res = await fetch(OPENAI_BASE, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: env.OPENAI_TEXT_MODEL,
                ...openaiTokenLimitBody(env.OPENAI_TEXT_MODEL, 320),
                temperature: 0.55,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: user },
                ],
            }),
        });
        if (!res.ok) {
            logger.warn({ status: res.status }, 'Market price OpenAI compose failed');
            return null;
        }
        const data = (await res.json());
        const text = data.choices?.[0]?.message?.content?.trim();
        return text ? text.slice(0, 3500) : null;
    }
    catch (err) {
        logger.warn({ err }, 'Market price OpenAI compose error');
        return null;
    }
}
export const dailyPricesService = {
    async formatForFarmer(farmerId, language) {
        const ctx = await fetchCompactFarmerContext(farmerId);
        const crop = ctx.cropType.toLowerCase();
        const today = new Date().toISOString().slice(0, 10);
        const { date, rows } = await fetchPriceRows(crop, today);
        const { data: farmer } = await supabase
            .from('farmers')
            .select('district')
            .eq('id', farmerId)
            .maybeSingle();
        const aiReply = await composeWithOpenAi({
            language,
            cropType: crop,
            cropStage: ctx.cropStage,
            dap: ctx.dap,
            district: farmer?.district ?? undefined,
            date,
            rows,
        });
        if (aiReply)
            return aiReply;
        if (!rows.length) {
            return `${t('pricesIntro', language)}\n\nNo prices published yet for ${crop}. Our team will update soon.`;
        }
        return this.formatRows(language, crop, date, rows);
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