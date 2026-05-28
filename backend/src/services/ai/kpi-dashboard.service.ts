import { supabase } from '../../lib/supabase.js';

export const kpiDashboardService = {
  async summary(days = 30): Promise<{
    diagnosisCount: number;
    escalationRate: number;
    lowConfidenceRate: number;
    followupImprovementRate: number;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const [{ count: diagCount }, { count: escalated }, { count: lowConf }, { data: outcomes }] =
      await Promise.all([
        supabase
          .from('ai_accuracy_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'diagnosis')
          .gte('created_at', since),
        supabase
          .from('ai_accuracy_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'diagnosis')
          .eq('escalated', true)
          .gte('created_at', since),
        supabase
          .from('ai_accuracy_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'diagnosis')
          .lt('confidence', 0.7)
          .gte('created_at', since),
        supabase.from('ai_case_outcomes').select('outcome').gte('created_at', since),
      ]);

    const total = diagCount ?? 0;
    const outcomeRows = outcomes ?? [];
    const improved = outcomeRows.filter((o) => o.outcome === 'improved' || o.outcome === 'partial').length;
    return {
      diagnosisCount: total,
      escalationRate: total ? Number(((escalated ?? 0) / total).toFixed(4)) : 0,
      lowConfidenceRate: total ? Number(((lowConf ?? 0) / total).toFixed(4)) : 0,
      followupImprovementRate: outcomeRows.length ? Number((improved / outcomeRows.length).toFixed(4)) : 0,
    };
  },
};

