import { supabase } from '../../../lib/supabase.js';
import { t } from './whatsapp-flow-copy.js';
import type { AdvisoryLanguage } from '../../ai/types.js';

/** Open-Meteo — free, no API key. Coords from farmer district defaults. */
const DISTRICT_COORDS: Record<string, { lat: number; lon: number; label: string }> = {
  wayanad: { lat: 11.6854, lon: 76.132, label: 'Wayanad' },
  ernakulam: { lat: 9.9312, lon: 76.2673, label: 'Kochi' },
  kochi: { lat: 9.9312, lon: 76.2673, label: 'Kochi' },
  bengaluru: { lat: 12.9716, lon: 77.5946, label: 'Bangalore' },
  bangalore: { lat: 12.9716, lon: 77.5946, label: 'Bangalore' },
};

const DEFAULT_COORDS = DISTRICT_COORDS.wayanad;

export const weatherAlertsService = {
  async formatForFarmer(farmerId: string, language: AdvisoryLanguage): Promise<string> {
    const { data: farmer } = await supabase
      .from('farmers')
      .select('district, state')
      .eq('id', farmerId)
      .maybeSingle();

    const districtKey = String(farmer?.district ?? 'wayanad')
      .toLowerCase()
      .replace(/\s+/g, '');
    const coords =
      DISTRICT_COORDS[districtKey] ??
      DISTRICT_COORDS[String(farmer?.state ?? '').toLowerCase()] ??
      DEFAULT_COORDS;

    try {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', String(coords.lat));
      url.searchParams.set('longitude', String(coords.lon));
      url.searchParams.set('daily', 'precipitation_sum,temperature_2m_max,relative_humidity_2m_mean');
      url.searchParams.set('forecast_days', '3');
      url.searchParams.set('timezone', 'Asia/Kolkata');

      const res = await fetch(url.toString());
      const data = (await res.json()) as {
        daily?: {
          time?: string[];
          precipitation_sum?: number[];
          temperature_2m_max?: number[];
          relative_humidity_2m_mean?: number[];
        };
      };

      const daily = data.daily;
      if (!daily?.time?.length) {
        return `${t('weatherIntro', language)}\n\n(${coords.label}) Weather data temporarily unavailable.`;
      }

      const lines: string[] = [`${t('weatherIntro', language)}\n\n📍 ${coords.label}`];
      for (let i = 0; i < Math.min(3, daily.time.length); i++) {
        const date = daily.time[i];
        const rain = daily.precipitation_sum?.[i] ?? 0;
        const temp = daily.temperature_2m_max?.[i];
        const humidity = daily.relative_humidity_2m_mean?.[i];
        const sprayOk = rain < 5;
        lines.push(
          `\n${date}:` +
            `\n• Rain: ${rain.toFixed(1)} mm` +
            (temp != null ? `\n• Max temp: ${temp.toFixed(0)}°C` : '') +
            (humidity != null ? `\n• Humidity: ${humidity.toFixed(0)}%` : '') +
            `\n• Spray: ${sprayOk ? '✅ Suitable' : '⚠️ Avoid if heavy rain'}`
        );
      }

      if ((daily.precipitation_sum?.[0] ?? 0) >= 10) {
        lines.push('\n\n⚠️ Heavy rain expected — avoid spray today if possible.');
      }

      return lines.join('');
    } catch {
      return `${t('weatherIntro', language)}\n\nWeather service temporarily unavailable.`;
    }
  },
};
