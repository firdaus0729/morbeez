function toBand(confidence) {
    if (confidence > 0.9)
        return 'high';
    if (confidence >= 0.7)
        return 'medium';
    return 'low';
}
function weatherBand(risk) {
    if (risk >= 70)
        return 'high';
    if (risk >= 40)
        return 'moderate';
    return 'low';
}
export const policyEngineService = {
    evaluate(advisory, contextPack) {
        const conf = Math.max(0, Math.min(1, advisory.confidence));
        const confidenceBand = toBand(conf);
        const weatherRiskScore = Math.max(0, Math.min(100, Number(contextPack?.weatherRiskScore ?? 35)));
        const weatherRiskBand = weatherBand(weatherRiskScore);
        const stressSignals = advisory.stressAnalysis?.length ?? 0;
        const diseaseSeverity = conf > 0.85 ? 'high' : conf >= 0.7 ? 'moderate' : 'low';
        const stressSeverity = stressSignals >= 3 ? 'high' : stressSignals >= 1 ? 'moderate' : 'low';
        const scoreRaw = conf * 60 - weatherRiskScore * 0.2 - (stressSignals > 1 ? 6 : 0);
        const cropHealthScore = Math.max(5, Math.min(95, Math.round(50 + scoreRaw)));
        const safetyNotes = [];
        if (contextPack?.heavyRainLikely) {
            safetyNotes.push('Heavy rain likely: avoid foliar spray, prefer drench/application after rain gap.');
        }
        if (contextPack?.highHeatLikely) {
            safetyNotes.push('High heat likely: avoid strong foliar spray during noon window.');
        }
        const shouldRequestMoreEvidence = confidenceBand === 'low';
        const needsValidationQuestion = confidenceBand === 'medium';
        const escalationPriority = confidenceBand === 'low' && weatherRiskBand === 'high'
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
//# sourceMappingURL=policy-engine.service.js.map