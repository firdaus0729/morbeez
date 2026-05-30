import { supabase } from '../../../lib/supabase.js';
import { seasonalPriorityService, type SeasonPhase } from './seasonal-priority.service.js';
import { fetchWeatherForecast, resolveCoords } from './weather-fetch.service.js';
import {
  diseaseWeatherRulesService,
  type DiseaseWeatherPrior,
} from './disease-weather-rules.service.js';
import { nearbyCasesService } from './nearby-cases.service.js';

export type ContextPack = {
  district?: string;
  pincode?: string;
  village?: string;
  seasonPhase: SeasonPhase;
  weatherRiskScore: number;
  heavyRainLikely: boolean;
  highHeatLikely: boolean;
  highHumidityLikely: boolean;
  avgHumidityPct?: number;
  rainMmToday?: number;
  maxTempCToday?: number;
  soilPh?: number;
  soilEc?: number;
  drainageRisk: 'low' | 'moderate' | 'high';
  diseasePriors: DiseaseWeatherPrior[];
  nearbySummary?: string;
};

export const contextPackService = {
  async build(farmerId: string, options?: { cropType?: string; symptomsText?: string; dap?: number }) {
    const { data: farmer } = await supabase
      .from('farmers')
      .select(
        'district, village, metadata, pincode_id, pincode_master(pincode, district, latitude, longitude, village)'
      )
      .eq('id', farmerId)
      .maybeSingle();

    const pm = farmer?.pincode_master as {
      pincode?: string;
      district?: string;
      latitude?: number;
      longitude?: number;
      village?: string;
    } | null;

    const coords = resolveCoords({
      district: farmer?.district ? String(farmer.district) : pm?.district,
      pincodeLat: pm?.latitude,
      pincodeLon: pm?.longitude,
      pincodeLabel: pm?.village
        ? `${pm.village}, ${pm?.district ?? ''}`
        : pm?.pincode
          ? `PIN ${pm.pincode}`
          : undefined,
    });

    const weather = await fetchWeatherForecast(coords);
    const seasonPhase = seasonalPriorityService.currentPhase();

    const meta = (farmer?.metadata ?? {}) as Record<string, unknown>;
    const soilPh = meta.soilPh != null ? Number(meta.soilPh) : undefined;
    const soilEc = meta.soilEc != null ? Number(meta.soilEc) : undefined;

    const drainageRisk: 'low' | 'moderate' | 'high' = weather.heavyRainLikely
      ? 'high'
      : weather.weatherRiskScore >= 45
        ? 'moderate'
        : 'low';

    const env = {
      seasonPhase,
      heavyRainLikely: weather.heavyRainLikely,
      highHumidityLikely: weather.highHumidityLikely,
      weatherRiskScore: weather.weatherRiskScore,
    };

    const cropType = options?.cropType ?? 'ginger';
    const diseasePriors = diseaseWeatherRulesService.evaluate({
      cropType,
      env,
      symptomsText: options?.symptomsText,
      dap: options?.dap,
    });

    const nearby = await nearbyCasesService.summarize(farmerId, cropType);
    const nearbySummary = nearbyCasesService.formatForPrompt(nearby);

    const pack: ContextPack = {
      district: farmer?.district ? String(farmer.district) : pm?.district,
      pincode: pm?.pincode ?? undefined,
      village: farmer?.village ? String(farmer.village) : pm?.village ?? undefined,
      seasonPhase,
      weatherRiskScore: weather.weatherRiskScore,
      heavyRainLikely: weather.heavyRainLikely,
      highHeatLikely: weather.highHeatLikely,
      highHumidityLikely: weather.highHumidityLikely,
      avgHumidityPct: weather.avgHumidityPct,
      rainMmToday: weather.rainMmToday,
      maxTempCToday: weather.maxTempCToday,
      soilPh,
      soilEc,
      drainageRisk,
      diseasePriors,
      nearbySummary: nearbySummary || undefined,
    };

    return pack;
  },

  /** Farmer- and model-facing environmental block for Crop Doctor / conversational AI. */
  formatForPrompt(pack: ContextPack): string {
    const lines: string[] = [];

    const loc = [pack.village, pack.district, pack.pincode ? `PIN ${pack.pincode}` : null]
      .filter(Boolean)
      .join(', ');
    if (loc) lines.push(`Field location: ${loc}.`);

    lines.push(`Season (Kerala IST): ${pack.seasonPhase}.`);
    lines.push(
      `Weather at field: rain today ${pack.rainMmToday ?? '?'} mm, max temp ${pack.maxTempCToday ?? '?'} °C, mean humidity ${pack.avgHumidityPct ?? '?'}%.`
    );
    if (pack.heavyRainLikely) lines.push('Heavy rain likely — leaf wetness high; fungal/airborne disease risk elevated.');
    if (pack.highHumidityLikely) {
      lines.push(
        'High atmospheric humidity — favour blast (Pyricularia), anthracnose, and rhizome rot in waterlogged soils.'
      );
    }
    if (pack.highHeatLikely) lines.push('High heat likely — avoid midday foliar sprays.');
    lines.push(`Weather risk score: ${pack.weatherRiskScore}/100; drainage risk: ${pack.drainageRisk}.`);

    const priors = diseaseWeatherRulesService.formatForPrompt(pack.diseasePriors);
    if (priors) {
      lines.push('Morbeez disease–weather priors (use with photo/symptoms; do not ignore contradictory visuals):');
      lines.push(priors);
    }

    if (pack.nearbySummary) {
      lines.push('Regional field intelligence:');
      lines.push(pack.nearbySummary);
    }

    return lines.join('\n');
  },
};
