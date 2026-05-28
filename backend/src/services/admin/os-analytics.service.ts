import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { kpiDashboardService } from '../ai/kpi-dashboard.service.js';

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function resolveDistrict(farmer: {
  district?: string | null;
  pincode_master?: { district?: string } | { district?: string }[] | null;
}): string {
  const pm = farmer.pincode_master;
  const fromPin = Array.isArray(pm) ? pm[0]?.district : pm?.district;
  const d = (fromPin ?? farmer.district ?? 'Unknown').trim();
  return d || 'Unknown';
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function bucketByDay(rows: Array<{ created_at: string }>, days: number): number[] {
  const buckets = new Array(days).fill(0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (const row of rows) {
    const d = new Date(row.created_at);
    d.setHours(0, 0, 0, 0);
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff >= 0 && diff < days) buckets[days - 1 - diff] += 1;
  }
  return buckets;
}

function dayLabels(days: number): string[] {
  const labels: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
  }
  return labels;
}

export const osAnalyticsService = {
  async getSummary(days = 30) {
    const since = daysAgoIso(days);
    const [geo, retention, broadcasts, recommendations, aiAccuracy] = await Promise.all([
      this.getDistrictHeatmap(days),
      this.getRetention(days),
      this.getBroadcastPerformance(days),
      this.getRecommendationSuccess(days),
      this.getAiAccuracy(days),
    ]);

    const topDistrict = geo.districts[0]?.district ?? '—';
    return {
      periodDays: days,
      since,
      kpis: {
        farmers: retention.totalFarmers,
        activeFarmers30d: retention.active30d,
        retentionRate30d: retention.rate30d,
        broadcastsSent: broadcasts.totals.sent,
        broadcastFailureRate: broadcasts.totals.failureRate,
        recommendationsTotal: recommendations.totals.created,
        recommendationSuccessRate: recommendations.totals.successRate,
        topDistrict,
        aiDiagnosisCount: aiAccuracy.diagnosisCount,
        aiEscalationRate: Math.round(aiAccuracy.escalationRate * 1000) / 10,
        aiLowConfidenceRate: Math.round(aiAccuracy.lowConfidenceRate * 1000) / 10,
        aiFollowupImprovementRate: Math.round(aiAccuracy.followupImprovementRate * 1000) / 10,
      },
      geography: geo,
      retention,
      broadcasts,
      recommendations,
      aiAccuracy,
    };
  },

  async getAiAccuracy(days = 30) {
    return kpiDashboardService.summary(days);
  },

  async getAiAccuracyTrends(days = 30) {
    const since = daysAgoIso(days);
    const { data: events, error: eErr } = await supabase
      .from('ai_accuracy_events')
      .select('created_at, confidence, escalated, weather_risk')
      .eq('event_type', 'diagnosis')
      .gte('created_at', since)
      .order('created_at', { ascending: true });
    throwIfSupabaseError(eErr, 'Could not load AI accuracy events');

    const { data: outcomes, error: oErr } = await supabase
      .from('ai_case_outcomes')
      .select('created_at, outcome')
      .gte('created_at', since)
      .order('created_at', { ascending: true });
    throwIfSupabaseError(oErr, 'Could not load AI outcomes');

    const labels = dayLabels(days);
    const byDay = new Map<string, { diagnoses: number; escalations: number; lowConfidence: number }>();
    for (const label of labels) {
      byDay.set(label, { diagnoses: 0, escalations: 0, lowConfidence: 0 });
    }

    for (const row of events ?? []) {
      const label = new Date(String(row.created_at)).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
      const bucket = byDay.get(label);
      if (!bucket) continue;
      bucket.diagnoses += 1;
      if (row.escalated) bucket.escalations += 1;
      if (Number(row.confidence ?? 0) < 0.7) bucket.lowConfidence += 1;
    }

    const outcomeDist = new Map<string, number>();
    for (const o of outcomes ?? []) {
      const key = String(o.outcome ?? 'unknown');
      outcomeDist.set(key, (outcomeDist.get(key) ?? 0) + 1);
    }

    const confidenceBands = { high: 0, medium: 0, low: 0 };
    for (const row of events ?? []) {
      const c = Number(row.confidence ?? 0);
      if (c > 0.9) confidenceBands.high += 1;
      else if (c >= 0.7) confidenceBands.medium += 1;
      else confidenceBands.low += 1;
    }

    return {
      periodDays: days,
      labels,
      dailyDiagnoses: labels.map((l) => byDay.get(l)?.diagnoses ?? 0),
      dailyEscalations: labels.map((l) => byDay.get(l)?.escalations ?? 0),
      dailyLowConfidence: labels.map((l) => byDay.get(l)?.lowConfidence ?? 0),
      confidenceBands,
      outcomeDistribution: [...outcomeDist.entries()].map(([outcome, count]) => ({ outcome, count })),
    };
  },

  async getDistrictHeatmap(days = 30) {
    const since = daysAgoIso(days);

    const { data: farmers, error: fErr } = await supabase
      .from('farmers')
      .select('id, district, pincode_id, pincode_master(district, pincode, taluk)');

    throwIfSupabaseError(fErr, 'Could not load farmers for geography');

    const { data: blocks, error: bErr } = await supabase
      .from('farm_blocks')
      .select('id, farmer_id, pincode_id, pincode_master(district)')
      .is('archived_at', null);

    throwIfSupabaseError(bErr, 'Could not load blocks');

    const { data: recs, error: rErr } = await supabase
      .from('recommendation_records')
      .select('id, farmer_id, created_at')
      .gte('created_at', since);

    throwIfSupabaseError(rErr, 'Could not load recommendations');

    const { data: deliveries, error: dErr } = await supabase
      .from('whatsapp_broadcast_deliveries')
      .select('id, farmer_id, status, created_at')
      .gte('created_at', since);

    throwIfSupabaseError(dErr, 'Could not load broadcasts');

    const farmerDistrict = new Map<string, string>();
    for (const f of farmers ?? []) {
      farmerDistrict.set(String(f.id), resolveDistrict(f as Parameters<typeof resolveDistrict>[0]));
    }

    type DistrictAgg = {
      district: string;
      farmers: number;
      blocks: number;
      recommendations: number;
      broadcastsSent: number;
      broadcastsFailed: number;
      pincodes: Set<string>;
    };

    const agg = new Map<string, DistrictAgg>();

    function touch(district: string) {
      if (!agg.has(district)) {
        agg.set(district, {
          district,
          farmers: 0,
          blocks: 0,
          recommendations: 0,
          broadcastsSent: 0,
          broadcastsFailed: 0,
          pincodes: new Set(),
        });
      }
      return agg.get(district)!;
    }

    for (const f of farmers ?? []) {
      const row = f as {
        id: string;
        pincode_master?: { district?: string; pincode?: string } | { district?: string; pincode?: string }[];
      };
      const d = resolveDistrict(row);
      const a = touch(d);
      a.farmers += 1;
      const pm = row.pincode_master;
      const pin = Array.isArray(pm) ? pm[0]?.pincode : pm?.pincode;
      if (pin) a.pincodes.add(String(pin));
    }

    for (const b of blocks ?? []) {
      const row = b as {
        farmer_id: string;
        pincode_master?: { district?: string } | { district?: string }[];
      };
      const d =
        row.pincode_master != null
          ? resolveDistrict({ pincode_master: row.pincode_master })
          : farmerDistrict.get(String(row.farmer_id)) ?? 'Unknown';
      touch(d).blocks += 1;
    }

    for (const r of recs ?? []) {
      const d = farmerDistrict.get(String(r.farmer_id)) ?? 'Unknown';
      touch(d).recommendations += 1;
    }

    for (const del of deliveries ?? []) {
      const d = farmerDistrict.get(String(del.farmer_id)) ?? 'Unknown';
      const a = touch(d);
      if (del.status === 'sent') a.broadcastsSent += 1;
      if (del.status === 'failed') a.broadcastsFailed += 1;
    }

    const districts = [...agg.values()]
      .map((a) => {
        const activityScore = a.farmers + a.recommendations * 2 + a.broadcastsSent;
        return {
          district: a.district,
          farmers: a.farmers,
          blocks: a.blocks,
          recommendations: a.recommendations,
          broadcastsSent: a.broadcastsSent,
          broadcastsFailed: a.broadcastsFailed,
          pincodeCount: a.pincodes.size,
          activityScore,
        };
      })
      .sort((x, y) => y.activityScore - x.activityScore);

    const maxScore = districts[0]?.activityScore ?? 1;

    return {
      periodDays: days,
      districts: districts.map((d) => ({
        ...d,
        intensity: Math.round((d.activityScore / maxScore) * 100),
      })),
      pincodeFirstNote:
        'Districts resolved from pincode_master when farmers have pincode_id; otherwise farmers.district.',
    };
  },

  async getPincodeBreakdown(district: string, days = 30) {
    const since = daysAgoIso(days);
    const { data: pincodes, error } = await supabase
      .from('pincode_master')
      .select('id, pincode, village, taluk, district')
      .eq('district', district)
      .eq('active', true)
      .order('pincode');

    throwIfSupabaseError(error, 'Could not load pincodes');

    const { data: farmers } = await supabase
      .from('farmers')
      .select('id, pincode_id')
      .gte('created_at', '1970-01-01');

    const { data: recs } = await supabase
      .from('recommendation_records')
      .select('id, farmer_id')
      .gte('created_at', since);

    const farmerPin = new Map<string, string>();
    for (const f of farmers ?? []) {
      if (f.pincode_id) farmerPin.set(String(f.id), String(f.pincode_id));
    }

    const byPin = new Map<string, { farmers: number; recommendations: number }>();
    for (const p of pincodes ?? []) {
      byPin.set(String(p.id), { farmers: 0, recommendations: 0 });
    }

    for (const f of farmers ?? []) {
      const pid = f.pincode_id ? String(f.pincode_id) : null;
      if (pid && byPin.has(pid)) byPin.get(pid)!.farmers += 1;
    }

    for (const r of recs ?? []) {
      const pid = farmerPin.get(String(r.farmer_id));
      if (pid && byPin.has(pid)) byPin.get(pid)!.recommendations += 1;
    }

    return {
      district,
      pincodes: (pincodes ?? []).map((p) => ({
        pincode: p.pincode,
        village: p.village,
        taluk: p.taluk,
        farmers: byPin.get(String(p.id))?.farmers ?? 0,
        recommendations: byPin.get(String(p.id))?.recommendations ?? 0,
      })),
    };
  },

  async getRetention(days = 30) {
    const d7 = daysAgoIso(7);
    const d30 = daysAgoIso(30);
    const d90 = daysAgoIso(90);

    const { count: totalFarmers } = await supabase
      .from('farmers')
      .select('id', { count: 'exact', head: true });

    const { data: login7 } = await supabase
      .from('farmers')
      .select('id')
      .gte('last_login_at', d7);

    const { data: login30 } = await supabase
      .from('farmers')
      .select('id')
      .gte('last_login_at', d30);

    const { data: interactions7 } = await supabase
      .from('interaction_logs')
      .select('farmer_id')
      .gte('created_at', d7);

    const { data: interactions30 } = await supabase
      .from('interaction_logs')
      .select('farmer_id')
      .gte('created_at', d30);

    const { data: newFarmers } = await supabase
      .from('farmers')
      .select('created_at')
      .gte('created_at', daysAgoIso(Math.min(days, 56)));

    const active7 = new Set<string>();
    for (const f of login7 ?? []) active7.add(String(f.id));
    for (const i of interactions7 ?? []) active7.add(String(i.farmer_id));

    const active30 = new Set<string>();
    for (const f of login30 ?? []) active30.add(String(f.id));
    for (const i of interactions30 ?? []) active30.add(String(i.farmer_id));

    const { data: stale } = await supabase
      .from('farmers')
      .select('id, last_login_at')
      .or(`last_login_at.is.null,last_login_at.lt.${d90}`);

    const cohortWeeks = 8;
    const cohort: Array<{ label: string; signups: number }> = [];
    for (let w = cohortWeeks - 1; w >= 0; w--) {
      const end = new Date();
      end.setDate(end.getDate() - w * 7);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      const signups = (newFarmers ?? []).filter((f) => {
        const t = new Date(f.created_at as string).getTime();
        return t >= start.getTime() && t <= end.getTime();
      }).length;
      cohort.push({
        label: start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        signups,
      });
    }

    const total = totalFarmers ?? 0;
    return {
      totalFarmers: total,
      active7d: active7.size,
      active30d: active30.size,
      rate7d: pct(active7.size, total),
      rate30d: pct(active30.size, total),
      inactive90d: stale?.length ?? 0,
      signupCohortByWeek: cohort,
    };
  },

  async getBroadcastPerformance(days = 30) {
    const since = daysAgoIso(days);
    const chartDays = Math.min(days, 14);

    const { data, error } = await supabase
      .from('whatsapp_broadcast_deliveries')
      .select('broadcast_kind, status, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000);

    throwIfSupabaseError(error, 'Could not load broadcast deliveries');

    const rows = data ?? [];
    const byKind: Record<string, { sent: number; failed: number; skipped: number }> = {};
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const r of rows) {
      const kind = String(r.broadcast_kind);
      if (!byKind[kind]) byKind[kind] = { sent: 0, failed: 0, skipped: 0 };
      if (r.status === 'sent') {
        byKind[kind].sent += 1;
        sent += 1;
      } else if (r.status === 'failed') {
        byKind[kind].failed += 1;
        failed += 1;
      } else {
        byKind[kind].skipped += 1;
        skipped += 1;
      }
    }

    const sentRows = rows.filter((r) => r.status === 'sent');
    const dailySent = bucketByDay(sentRows, chartDays);

    return {
      periodDays: days,
      totals: {
        sent,
        failed,
        skipped,
        total: rows.length,
        failureRate: pct(failed, sent + failed),
      },
      byKind: Object.entries(byKind)
        .map(([kind, v]) => ({ kind, ...v, total: v.sent + v.failed + v.skipped }))
        .sort((a, b) => b.total - a.total),
      dailySent,
      dailyLabels: dayLabels(chartDays),
    };
  },

  async getRecommendationSuccess(days = 30) {
    const since = daysAgoIso(days);

    const { data, error } = await supabase
      .from('recommendation_records')
      .select('id, status, outcome, source, created_at, communicated_at, outcome_at')
      .gte('created_at', since);

    throwIfSupabaseError(error, 'Could not load recommendation records');

    const rows = data ?? [];
    const byStatus: Record<string, number> = {};
    const byOutcome: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    let communicated = 0;
    let withOutcome = 0;
    let positiveOutcome = 0;

    for (const r of rows) {
      const st = String(r.status);
      byStatus[st] = (byStatus[st] ?? 0) + 1;
      const src = String(r.source);
      bySource[src] = (bySource[src] ?? 0) + 1;
      if (['communicated', 'applied', 'outcome_recorded'].includes(st)) communicated += 1;
      if (r.outcome) {
        withOutcome += 1;
        const o = String(r.outcome);
        byOutcome[o] = (byOutcome[o] ?? 0) + 1;
        if (o === 'better' || o === 'partial') positiveOutcome += 1;
      }
    }

    const approved = (byStatus.approved ?? 0) + communicated;
    const created = rows.length;

    return {
      periodDays: days,
      totals: {
        created,
        approved,
        communicated,
        withOutcome,
        positiveOutcome,
        successRate: pct(positiveOutcome, withOutcome || communicated || created),
        approvalRate: pct(approved, created),
      },
      byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      byOutcome: Object.entries(byOutcome).map(([outcome, count]) => ({ outcome, count })),
      bySource: Object.entries(bySource).map(([source, count]) => ({ source, count })),
      funnel: [
        { stage: 'Created', count: created },
        { stage: 'Pending approval', count: byStatus.pending_approval ?? 0 },
        { stage: 'Approved+', count: approved },
        { stage: 'Communicated+', count: communicated },
        { stage: 'Outcome recorded', count: byStatus.outcome_recorded ?? 0 },
      ],
    };
  },
};
