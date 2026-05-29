import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';

export type FarmerExperienceStats = {
  farmerId: string;
  correctIdentifications: number;
  totalFeedbackSubmitted: number;
  approvedFeedbackCount: number;
  rejectedFeedbackCount: number;
  recommendationSuccessRate: number | null;
  primaryCropSpecialization: string | null;
  trustScore: number;
};

function clampTrust(n: number): number {
  return Math.min(1, Math.max(0.1, n));
}

/** Weight multiplier for promoting farmer-sourced learning (0.5–1.2). */
export function trustWeightFromStats(stats: FarmerExperienceStats, cropExperienceYears?: number | null): number {
  let w = stats.trustScore;
  if (cropExperienceYears != null && cropExperienceYears >= 10) w += 0.15;
  else if (cropExperienceYears != null && cropExperienceYears >= 5) w += 0.08;
  if (stats.approvedFeedbackCount >= 3) w += 0.1;
  if (stats.recommendationSuccessRate != null && stats.recommendationSuccessRate >= 0.7) w += 0.1;
  return Math.min(1.2, w);
}

export const farmerExperienceWeightService = {
  async getOrCreate(farmerId: string): Promise<FarmerExperienceStats> {
    const { data: existing } = await supabase
      .from('farmer_experience_stats')
      .select('*')
      .eq('farmer_id', farmerId)
      .maybeSingle();

    if (existing) {
      return this.mapRow(existing as Record<string, unknown>);
    }

    const { data, error } = await supabase
      .from('farmer_experience_stats')
      .insert({ farmer_id: farmerId })
      .select()
      .single();

    throwIfSupabaseError(error, 'Could not init farmer experience stats');
    return this.mapRow(data as Record<string, unknown>);
  },

  mapRow(r: Record<string, unknown>): FarmerExperienceStats {
    return {
      farmerId: String(r.farmer_id),
      correctIdentifications: Number(r.correct_identifications ?? 0),
      totalFeedbackSubmitted: Number(r.total_feedback_submitted ?? 0),
      approvedFeedbackCount: Number(r.approved_feedback_count ?? 0),
      rejectedFeedbackCount: Number(r.rejected_feedback_count ?? 0),
      recommendationSuccessRate:
        r.recommendation_success_rate != null ? Number(r.recommendation_success_rate) : null,
      primaryCropSpecialization: r.primary_crop_specialization
        ? String(r.primary_crop_specialization)
        : null,
      trustScore: Number(r.trust_score ?? 0.5),
    };
  },

  async refreshRecommendationSuccessRate(farmerId: string): Promise<void> {
    const { data: recs } = await supabase
      .from('recommendation_records')
      .select('outcome, application_status')
      .eq('farmer_id', farmerId)
      .not('outcome', 'is', null)
      .limit(50);

    const outcomes = recs ?? [];
    if (outcomes.length === 0) return;

    const success = outcomes.filter((o) =>
      ['better', 'improved', 'partial'].includes(String(o.outcome))
    ).length;
    const rate = success / outcomes.length;

    await supabase
      .from('farmer_experience_stats')
      .upsert(
        {
          farmer_id: farmerId,
          recommendation_success_rate: rate,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'farmer_id' }
      );
  },

  async onFeedbackSubmitted(farmerId: string, cropType?: string): Promise<void> {
    const stats = await this.getOrCreate(farmerId);
    await supabase
      .from('farmer_experience_stats')
      .update({
        total_feedback_submitted: stats.totalFeedbackSubmitted + 1,
        primary_crop_specialization: cropType?.toLowerCase() ?? stats.primaryCropSpecialization,
        updated_at: new Date().toISOString(),
      })
      .eq('farmer_id', farmerId);
    await this.refreshRecommendationSuccessRate(farmerId).catch(() => {});
  },

  async onFeedbackReviewed(
    farmerId: string,
    decision: 'approved' | 'rejected' | 'partial'
  ): Promise<FarmerExperienceStats> {
    const stats = await this.getOrCreate(farmerId);
    let approved = stats.approvedFeedbackCount;
    let rejected = stats.rejectedFeedbackCount;
    let correct = stats.correctIdentifications;
    let trust = stats.trustScore;

    if (decision === 'approved') {
      approved += 1;
      correct += 1;
      trust = clampTrust(trust + 0.08);
    } else if (decision === 'partial') {
      approved += 1;
      trust = clampTrust(trust + 0.04);
    } else {
      rejected += 1;
      trust = clampTrust(trust - 0.05);
    }

    const { data, error } = await supabase
      .from('farmer_experience_stats')
      .update({
        approved_feedback_count: approved,
        rejected_feedback_count: rejected,
        correct_identifications: correct,
        trust_score: trust,
        updated_at: new Date().toISOString(),
      })
      .eq('farmer_id', farmerId)
      .select()
      .single();

    throwIfSupabaseError(error, 'Could not update experience stats');
    return this.mapRow(data as Record<string, unknown>);
  },
};
