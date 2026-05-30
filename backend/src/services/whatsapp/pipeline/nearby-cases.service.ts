import { supabase } from '../../../lib/supabase.js';

export type NearbyCaseSummary = {
  pincode: string | null;
  district: string | null;
  samePincodeFarmers: number;
  recentIssues: Array<{ issueLabel: string; count: number }>;
  verifiedReuseHits: number;
};

const LOOKBACK_DAYS = 30;

export const nearbyCasesService = {
  async summarize(farmerId: string, cropType: string): Promise<NearbyCaseSummary> {
    const { data: farmer } = await supabase
      .from('farmers')
      .select('district, pincode_id, pincode_master(pincode, district)')
      .eq('id', farmerId)
      .maybeSingle();

    const pm = farmer?.pincode_master as { pincode?: string; district?: string } | null;
    const pincode = pm?.pincode ?? null;
    const district = farmer?.district
      ? String(farmer.district).trim().toLowerCase()
      : pm?.district?.toLowerCase() ?? null;

    let samePincodeFarmers = 0;
    if (farmer?.pincode_id) {
      const { count } = await supabase
        .from('farmers')
        .select('id', { count: 'exact', head: true })
        .eq('pincode_id', farmer.pincode_id)
        .neq('id', farmerId);
      samePincodeFarmers = count ?? 0;
    }

    const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();
    const crop = cropType.toLowerCase();

    let historyQuery = supabase
      .from('disease_history')
      .select('issue_label, farmer_id')
      .eq('crop_type', crop)
      .gte('recorded_at', since)
      .neq('farmer_id', farmerId);

    let peerFarmerIds: string[] | null = null;

    if (farmer?.pincode_id) {
      const { data: peerIds } = await supabase
        .from('farmers')
        .select('id')
        .eq('pincode_id', farmer.pincode_id)
        .neq('id', farmerId);
      peerFarmerIds = (peerIds ?? []).map((r) => String(r.id));
    } else if (district) {
      const { data: peerIds } = await supabase
        .from('farmers')
        .select('id')
        .ilike('district', district)
        .neq('id', farmerId)
        .limit(200);
      peerFarmerIds = (peerIds ?? []).map((r) => String(r.id));
    }

    let history: { issue_label: string | null; farmer_id: string }[] = [];
    if (peerFarmerIds?.length) {
      const { data } = await historyQuery.in('farmer_id', peerFarmerIds).limit(80);
      history = data ?? [];
    }


    const issueCounts = new Map<string, number>();
    for (const row of history ?? []) {
      const label = String(row.issue_label ?? '').trim();
      if (!label) continue;
      issueCounts.set(label, (issueCounts.get(label) ?? 0) + 1);
    }

    const recentIssues = [...issueCounts.entries()]
      .map(([issueLabel, count]) => ({ issueLabel, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const { count: reuseHits } = await supabase
      .from('advisory_reuse_cases')
      .select('id', { count: 'exact', head: true })
      .eq('crop_type', crop)
      .eq('outcome_ok', true)
      .in('district', [district ?? '', '']);

    return {
      pincode,
      district,
      samePincodeFarmers,
      recentIssues,
      verifiedReuseHits: reuseHits ?? 0,
    };
  },

  formatForPrompt(summary: NearbyCaseSummary): string {
    const lines: string[] = [];
    if (summary.pincode) {
      lines.push(`Pincode: ${summary.pincode} (${summary.samePincodeFarmers} other farmers in same pincode).`);
    } else if (summary.district) {
      lines.push(`District: ${summary.district}.`);
    }
    if (summary.recentIssues.length) {
      lines.push(
        'Nearby farmers (same pincode/district, last 30 days): ' +
          summary.recentIssues.map((i) => `${i.issueLabel} (${i.count})`).join('; ')
      );
    }
    if (summary.verifiedReuseHits > 0) {
      lines.push(
        `Verified Morbeez reuse cases for this crop in region: ${summary.verifiedReuseHits}.`
      );
    }
    return lines.join('\n');
  },
};
