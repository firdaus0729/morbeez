import { supabase } from '../../lib/supabase.js';
import { eventBus } from '../../events/bus.js';
import { computeConfidence, escalationReason, shouldEscalate } from './confidence.js';
export const escalationService = {
    async createIfNeeded(params) {
        const confidence = computeConfidence(params.advisory.confidence, params.plantId ?? null);
        await supabase
            .from('ai_advisory_sessions')
            .update({
            confidence_score: confidence,
            escalation_recommended: shouldEscalate(confidence, params.advisory),
            updated_at: new Date().toISOString(),
        })
            .eq('id', params.sessionId);
        if (!shouldEscalate(confidence, params.advisory)) {
            return { escalated: false, confidence };
        }
        const reason = escalationReason(confidence, params.advisory);
        const priority = confidence < 0.4 ? 'urgent' : confidence < 0.55 ? 'high' : 'normal';
        const { data, error } = await supabase
            .from('agronomist_escalations')
            .insert({
            session_id: params.sessionId,
            farmer_id: params.farmerId,
            reason,
            confidence_at_escalation: confidence,
            priority,
            status: 'pending',
        })
            .select()
            .single();
        if (error)
            throw error;
        await supabase
            .from('ai_advisory_sessions')
            .update({ status: 'escalated', updated_at: new Date().toISOString() })
            .eq('id', params.sessionId);
        await eventBus.publish('advisory.escalated', {
            sessionId: params.sessionId,
            farmerId: params.farmerId,
            escalationId: data.id,
            reason,
            priority,
        }, 'escalation-service');
        return { escalated: true, escalationId: data.id, confidence };
    },
};
//# sourceMappingURL=escalation.service.js.map