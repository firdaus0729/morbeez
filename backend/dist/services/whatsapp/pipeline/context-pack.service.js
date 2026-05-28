import { supabase } from '../../../lib/supabase.js';
const DISTRICT_COORDS = {
    wayanad: { lat: 11.6854, lon: 76.132 },
    ernakulam: { lat: 9.9312, lon: 76.2673 },
    kochi: { lat: 9.9312, lon: 76.2673 },
    bengaluru: { lat: 12.9716, lon: 77.5946 },
    bangalore: { lat: 12.9716, lon: 77.5946 },
};
export const contextPackService = {
    async build(farmerId) {
        const { data: farmer } = await supabase
            .from('farmers')
            .select('district, metadata')
            .eq('id', farmerId)
            .maybeSingle();
        const district = String(farmer?.district ?? '').toLowerCase().replace(/\s+/g, '');
        const coords = DISTRICT_COORDS[district] ?? DISTRICT_COORDS.wayanad;
        const meta = (farmer?.metadata ?? {});
        const soilPh = meta.soilPh != null ? Number(meta.soilPh) : undefined;
        const soilEc = meta.soilEc != null ? Number(meta.soilEc) : undefined;
        let weatherRiskScore = 35;
        let heavyRainLikely = false;
        let highHeatLikely = false;
        try {
            const url = new URL('https://api.open-meteo.com/v1/forecast');
            url.searchParams.set('latitude', String(coords.lat));
            url.searchParams.set('longitude', String(coords.lon));
            url.searchParams.set('daily', 'precipitation_sum,temperature_2m_max');
            url.searchParams.set('forecast_days', '2');
            url.searchParams.set('timezone', 'Asia/Kolkata');
            const res = await fetch(url.toString());
            const data = (await res.json());
            const rain = Number(data.daily?.precipitation_sum?.[0] ?? 0);
            const temp = Number(data.daily?.temperature_2m_max?.[0] ?? 0);
            heavyRainLikely = rain >= 10;
            highHeatLikely = temp >= 34;
            weatherRiskScore = Math.min(100, Math.round(rain * 4 + Math.max(0, temp - 30) * 6));
        }
        catch {
            // keep defaults when weather fetch fails
        }
        const drainageRisk = heavyRainLikely ? 'high' : weatherRiskScore >= 45 ? 'moderate' : 'low';
        return {
            district: farmer?.district ? String(farmer.district) : undefined,
            weatherRiskScore,
            heavyRainLikely,
            highHeatLikely,
            soilPh,
            soilEc,
            drainageRisk,
        };
    },
};
//# sourceMappingURL=context-pack.service.js.map