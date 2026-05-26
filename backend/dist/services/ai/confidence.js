import { env } from '../../config/env.js';
export function getEscalationThreshold() {
    return env.AI_ESCALATION_THRESHOLD;
}
/** Merge Plant.id signal with GPT self-reported confidence */
export function computeConfidence(gptConfidence, plantId) {
    let plantSignal = 0.5;
    if (plantId?.diseases?.length) {
        plantSignal = Math.max(...plantId.diseases.map((d) => d.probability));
    }
    else if (plantId?.isHealthy === true) {
        plantSignal = 0.75;
    }
    const merged = gptConfidence * 0.6 + plantSignal * 0.4;
    return Math.round(Math.min(1, Math.max(0, merged)) * 10000) / 10000;
}
export function shouldEscalate(confidence, advisory) {
    const threshold = getEscalationThreshold();
    if (advisory.uncertain || advisory.escalationRecommended)
        return true;
    if (confidence < threshold)
        return true;
    if (!advisory.probableIssue || advisory.probableIssue.toLowerCase().includes('uncertain'))
        return true;
    return false;
}
export function escalationReason(confidence, advisory) {
    if (advisory.escalationReason)
        return advisory.escalationReason;
    if (advisory.uncertain)
        return 'AI marked diagnosis as uncertain';
    const threshold = getEscalationThreshold();
    if (confidence < threshold) {
        return `Confidence ${(confidence * 100).toFixed(0)}% below threshold ${threshold * 100}%`;
    }
    return 'Manual agronomist review recommended';
}
//# sourceMappingURL=confidence.js.map