import type { PlantIdHealthResult, StructuredAdvisory } from './types.js';

export const ESCALATION_THRESHOLD = 0.65;

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

  const merged = gptConfidence * 0.6 + plantSignal * 0.4;
  return Math.round(Math.min(1, Math.max(0, merged)) * 10000) / 10000;
}

export function shouldEscalate(confidence: number, advisory: StructuredAdvisory): boolean {
  if (advisory.uncertain || advisory.escalationRecommended) return true;
  if (confidence < ESCALATION_THRESHOLD) return true;
  if (!advisory.probableIssue || advisory.probableIssue.toLowerCase().includes('uncertain')) return true;
  return false;
}

export function escalationReason(confidence: number, advisory: StructuredAdvisory): string {
  if (advisory.escalationReason) return advisory.escalationReason;
  if (advisory.uncertain) return 'AI marked diagnosis as uncertain';
  if (confidence < ESCALATION_THRESHOLD) {
    return `Confidence ${(confidence * 100).toFixed(0)}% below threshold ${ESCALATION_THRESHOLD * 100}%`;
  }
  return 'Manual agronomist review recommended';
}
