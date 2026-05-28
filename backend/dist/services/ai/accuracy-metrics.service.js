import { supabase } from '../../lib/supabase.js';
export const accuracyMetricsService = {
    async logDiagnosisEvent(params) {
        await supabase.from('ai_accuracy_events').insert({
            session_id: params.sessionId,
            farmer_id: params.farmerId,
            crop_type: params.cropType,
            confidence: params.confidence,
            escalated: params.escalated,
            source: params.source,
            weather_risk: params.weatherRisk ?? null,
            event_type: 'diagnosis',
        });
    },
    async logFollowupOutcome(params) {
        await supabase.from('ai_case_outcomes').insert({
            farmer_id: params.farmerId,
            session_id: params.sessionId ?? null,
            outcome: params.outcome,
            notes: params.notes ?? null,
        });
    },
};
//# sourceMappingURL=accuracy-metrics.service.js.map