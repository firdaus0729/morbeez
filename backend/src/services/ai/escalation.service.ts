import { supabase } from '../../lib/supabase.js';
import { eventBus } from '../../events/bus.js';
import { computeConfidence, escalationReason, shouldEscalate } from './confidence.js';
import type { PlantIdHealthResult, StructuredAdvisory } from './types.js';

export const OPEN_ESCALATION_STATUSES = ['pending', 'assigned', 'in_review'] as const;

const PRIORITY_RANK: Record<string, number> = {
  low: 1,
  normal: 2,
  high: 3,
  urgent: 4,
};

function higherPriority(a: string, b: string): string {
  return (PRIORITY_RANK[a] ?? 2) >= (PRIORITY_RANK[b] ?? 2) ? a : b;
}

/** Keep first row per farmer after caller has sorted (priority / newest). */
export function dedupeEscalationsByFarmer<T extends { farmerId: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = String(item.farmerId);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export type EnsureOpenEscalationInput = {
  sessionId: string;
  farmerId: string;
  reason: string;
  confidence_at_escalation: number;
  priority: string;
};

export const escalationService = {
  async ensureOpenEscalation(
    params: EnsureOpenEscalationInput
  ): Promise<{ escalationId: string; created: boolean }> {
    const now = new Date().toISOString();

    const { data: openRows, error: loadErr } = await supabase
      .from('agronomist_escalations')
      .select('id, priority, status')
      .eq('farmer_id', params.farmerId)
      .in('status', [...OPEN_ESCALATION_STATUSES])
      .order('updated_at', { ascending: false });

    if (loadErr) throw loadErr;

    const rows = openRows ?? [];
    const primary = rows[0] ?? null;

    if (rows.length > 1) {
      const dupIds = rows.slice(1).map((r) => r.id);
      await supabase
        .from('agronomist_escalations')
        .update({
          status: 'closed',
          resolution: 'superseded',
          resolved_at: now,
          updated_at: now,
        })
        .in('id', dupIds);
    }

    if (primary) {
      const patch: Record<string, unknown> = {
        session_id: params.sessionId,
        reason: params.reason,
        confidence_at_escalation: params.confidence_at_escalation,
        priority: higherPriority(String(primary.priority), params.priority),
        updated_at: now,
      };

      if (primary.status === 'assigned') {
        patch.status = 'pending';
        patch.assigned_to = null;
      }

      const { data, error } = await supabase
        .from('agronomist_escalations')
        .update(patch)
        .eq('id', primary.id)
        .select('id')
        .single();

      if (error) throw error;
      return { escalationId: data.id, created: false };
    }

    const { data, error } = await supabase
      .from('agronomist_escalations')
      .insert({
        session_id: params.sessionId,
        farmer_id: params.farmerId,
        reason: params.reason,
        confidence_at_escalation: params.confidence_at_escalation,
        priority: params.priority,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) throw error;
    return { escalationId: data.id, created: true };
  },

  async createIfNeeded(params: {
    sessionId: string;
    farmerId: string;
    advisory: StructuredAdvisory;
    plantId?: PlantIdHealthResult | null;
  }): Promise<{ escalated: boolean; escalationId?: string; confidence: number }> {
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
    const priority =
      confidence < 0.4 ? 'urgent' : confidence < 0.55 ? 'high' : 'normal';

    const { escalationId } = await this.ensureOpenEscalation({
      sessionId: params.sessionId,
      farmerId: params.farmerId,
      reason,
      confidence_at_escalation: confidence,
      priority,
    });

    await supabase
      .from('ai_advisory_sessions')
      .update({ status: 'escalated', updated_at: new Date().toISOString() })
      .eq('id', params.sessionId);

    await eventBus.publish(
      'advisory.escalated',
      {
        sessionId: params.sessionId,
        farmerId: params.farmerId,
        escalationId,
        reason,
        priority,
      },
      'escalation-service'
    );

    return { escalated: true, escalationId, confidence };
  },
};
