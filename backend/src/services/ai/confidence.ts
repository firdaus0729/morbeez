import { env } from '../../config/env.js';
import type { PlantIdHealthResult, StructuredAdvisory } from './types.js';

export function getEscalationThreshold(): number {
  return env.AI_ESCALATION_THRESHOLD;
}

/** Merge Plant.id signal with GPT self-reported confidence */
export function computeConfidence(
  gptConfidence: number,
  plantId?: PlantIdHealthResult | null
): number {
  let plantSignal = 0.5;
  if (plantId?.diseases?.length) {
    plantSignal = Math.max(...plantId.diseases.map((d) => d.probability));
  } else if (plantId?.isHealthy === true) {
    plantSignal = 0.75;
  }

  const hasPlantDisease = Boolean(plantId?.diseases?.length);
  const merged = hasPlantDisease
    ? gptConfidence * 0.6 + plantSignal * 0.4
    : gptConfidence * 0.92 + plantSignal * 0.08;
  return Math.round(Math.min(1, Math.max(0, merged)) * 10000) / 10000;
}

export function shouldEscalate(confidence: number, advisory: StructuredAdvisory): boolean {
  const threshold = getEscalationThreshold();
  if (advisory.uncertain || advisory.escalationRecommended) return true;
  if (confidence < threshold) return true;
  if (!advisory.probableIssue || advisory.probableIssue.toLowerCase().includes('uncertain')) return true;
  return false;
}

export function escalationReason(confidence: number, advisory: StructuredAdvisory): string {
  if (advisory.escalationReason) return advisory.escalationReason;
  if (advisory.uncertain) return 'AI marked diagnosis as uncertain';
  const threshold = getEscalationThreshold();
  if (confidence < threshold) {
    return `Confidence ${(confidence * 100).toFixed(0)}% below threshold ${threshold * 100}%`;
  }
  return 'Manual agronomist review recommended';
}
