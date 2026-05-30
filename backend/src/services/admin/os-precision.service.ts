import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export const osPrecisionService = {
  /**
   * Morbeez modular AI precision — reuse, module mix, vs generic OpenAI path.
   */
  async getModulePrecision(days = 30) {
    const since = daysAgoIso(days);

    const { data: attributions, error: attrErr } = await supabase
      .from('whatsapp_reply_attributions')
      .select('module_source, crop_type, district, created_at')
      .gte('created_at', since);
    throwIfSupabaseError(attrErr, 'Could not load reply attributions');

    const rows = attributions ?? [];
    const totalReplies = rows.length;

    const byModule = new Map<string, number>();
    for (const r of rows) {
      const key = String(r.module_source);
      byModule.set(key, (byModule.get(key) ?? 0) + 1);
    }

    const moduleBreakdown = [...byModule.entries()]
      .map(([module, count]) => ({
        module,
        count,
        sharePct: pct(count, totalReplies),
      }))
      .sort((a, b) => b.count - a.count);

    const modularModules = new Set([
      'verified_case',
      'compatibility_chart',
      'knowledge_fallback',
      'crop_doctor_reuse',
      'playbook',
      'regional_learning',
      'follow_up_memory',
    ]);
    const modularCount = rows.filter((r) => modularModules.has(String(r.module_source))).length;
    const openaiCount = rows.filter((r) =>
      ['crop_doctor_openai', 'conversational_openai'].includes(String(r.module_source))
    ).length;

    const { count: reuseCaseTotal, error: reuseErr } = await supabase
      .from('advisory_reuse_cases')
      .select('id', { count: 'exact', head: true })
      .eq('outcome_ok', true);
    throwIfSupabaseError(reuseErr, 'Could not count reuse cases');

    const { data: reuseHits, error: hitErr } = await supabase
      .from('advisory_reuse_cases')
      .select('hit_count, crop_type, district')
      .eq('outcome_ok', true)
      .order('hit_count', { ascending: false })
      .limit(15);
    throwIfSupabaseError(hitErr, 'Could not load reuse hits');

    const { data: sessions, error: sessErr } = await supabase
      .from('ai_advisory_sessions')
      .select('id, confidence_score, status, metadata, crop_type, created_at')
      .gte('created_at', since);
    throwIfSupabaseError(sessErr, 'Could not load advisory sessions');

    const sessionRows = sessions ?? [];
    const diagnosisTotal = sessionRows.length;
    let reusedFromCache = 0;
    let escalated = 0;
    for (const s of sessionRows) {
      const meta = (s.metadata ?? {}) as Record<string, unknown>;
      if (meta.reusedFrom || meta.reuseCaseId) reusedFromCache += 1;
      if (s.status === 'escalated') escalated += 1;
    }

    const { data: events, error: evErr } = await supabase
      .from('ai_accuracy_events')
      .select('escalated, confidence')
      .eq('event_type', 'diagnosis')
      .gte('created_at', since);
    throwIfSupabaseError(evErr, 'Could not load accuracy events');

    const evRows = events ?? [];
    const avgConfidence =
      evRows.length > 0
        ? Math.round(
            (evRows.reduce((s, e) => s + Number(e.confidence ?? 0), 0) / evRows.length) * 100
          )
        : 0;

    const topCrops = new Map<string, number>();
    for (const r of rows) {
      const c = r.crop_type ? String(r.crop_type) : 'unknown';
      topCrops.set(c, (topCrops.get(c) ?? 0) + 1);
    }

    return {
      periodDays: days,
      since,
      kpis: {
        whatsappRepliesTagged: totalReplies,
        modularReplySharePct: pct(modularCount, totalReplies),
        openaiReplySharePct: pct(openaiCount, totalReplies),
        verifiedReuseCasesTotal: reuseCaseTotal ?? 0,
        diagnosisSessions: diagnosisTotal,
        diagnosisFromReuseCachePct: pct(reusedFromCache, diagnosisTotal),
        escalationRatePct: pct(escalated, diagnosisTotal),
        avgDiagnosisConfidencePct: avgConfidence,
        uspHeadline:
          modularCount >= openaiCount
            ? 'Morbeez modules leading — precision compounds from verified field data'
            : 'Increase module hits — more agronomist-approved cases will reduce generic OpenAI reliance',
      },
      moduleBreakdown,
      topReuseCases: (reuseHits ?? []).map((r) => ({
        cropType: r.crop_type,
        district: r.district || '(any)',
        hitCount: r.hit_count ?? 0,
      })),
      topCropsByReplies: [...topCrops.entries()]
        .map(([crop, count]) => ({ crop, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    };
  },
};
