import type { StructuredAdvisory } from './types.js';

export type WeatherRiskBand = 'low' | 'moderate' | 'high';

export type PolicyAssessment = {
  cropHealthScore: number;
  diseaseSeverity: 'low' | 'moderate' | 'high';
  stressSeverity: 'low' | 'moderate' | 'high';
  weatherRiskScore: number;
  weatherRiskBand: WeatherRiskBand;
  confidenceBand: 'high' | 'medium' | 'low';
  needsValidationQuestion: boolean;
  shouldRequestMoreEvidence: boolean;
  escalationPriority: 'normal' | 'high' | 'urgent';
  safetyNotes: string[];
};

function toBand(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence > 0.9) return 'high';
  if (confidence >= 0.7) return 'medium';
  return 'low';
}

function weatherBand(risk: number): WeatherRiskBand {
  if (risk >= 70) return 'high';
  if (risk >= 40) return 'moderate';
  return 'low';
}

export const policyEngineService = {
  evaluate(
    advisory: StructuredAdvisory,
    contextPack?: {
      weatherRiskScore?: number;
      heavyRainLikely?: boolean;
      highHeatLikely?: boolean;
      highHumidityLikely?: boolean;
      /** When farmer sent a crop photo, always deliver AI advisory (do not ask only for clearer photos). */
      hasImage?: boolean;
    }
  ): PolicyAssessment {
    const conf = Math.max(0, Math.min(1, advisory.confidence));
    const confidenceBand = toBand(conf);
    const weatherRiskScore = Math.max(0, Math.min(100, Number(contextPack?.weatherRiskScore ?? 35)));
    const weatherRiskBand = weatherBand(weatherRiskScore);
    const stressSignals = advisory.stressAnalysis?.length ?? 0;

    const diseaseSeverity: 'low' | 'moderate' | 'high' =
      conf > 0.85 ? 'high' : conf >= 0.7 ? 'moderate' : 'low';
    const stressSeverity: 'low' | 'moderate' | 'high' =
      stressSignals >= 3 ? 'high' : stressSignals >= 1 ? 'moderate' : 'low';

    const scoreRaw = conf * 60 - weatherRiskScore * 0.2 - (stressSignals > 1 ? 6 : 0);
    const cropHealthScore = Math.max(5, Math.min(95, Math.round(50 + scoreRaw)));

    const safetyNotes: string[] = [];
    if (contextPack?.heavyRainLikely) {
      safetyNotes.push('Heavy rain likely: avoid foliar spray, prefer drench/application after rain gap.');
    }
    if (contextPack?.highHeatLikely) {
      safetyNotes.push('High heat likely: avoid strong foliar spray during noon window.');
    }
    if (contextPack?.highHumidityLikely) {
      safetyNotes.push(
        'High humidity — blast/fungal diseases spread by air and rain splash; spray when leaves are dry.'
      );
    }

    const hasActionableDiagnosis =
      Boolean(advisory.probableIssue?.trim()) &&
      !/uncertain|unknown|cannot|unclear/i.test(advisory.probableIssue);

    const shouldRequestMoreEvidence =
      !contextPack?.hasImage &&
      confidenceBand === 'low' &&
      !hasActionableDiagnosis;

    const needsValidationQuestion =
      contextPack?.hasImage && confidenceBand === 'low'
        ? true
        : confidenceBand === 'medium';
    const escalationPriority: 'normal' | 'high' | 'urgent' =
      confidenceBand === 'low' && weatherRiskBand === 'high'
        ? 'urgent'
        : confidenceBand === 'low' || diseaseSeverity === 'high'
          ? 'high'
          : 'normal';

    return {
      cropHealthScore,
      diseaseSeverity,
      stressSeverity,
      weatherRiskScore,
      weatherRiskBand,
      confidenceBand,
      needsValidationQuestion,
      shouldRequestMoreEvidence,
      escalationPriority,
      safetyNotes,
    };
  },
};

