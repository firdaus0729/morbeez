import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';

export const localPracticesService = {
  async recordFromFeedback(params: {
    feedbackId: string;
    farmerId: string;
    sessionId: string | null;
    cropType: string;
    district: string | null;
    pincode?: string | null;
    village?: string | null;
    problemLabel: string;
    farmerPractice: string;
    outcome?: string | null;
    verifiedBy: string;
  }): Promise<void> {
    const { error } = await supabase.from('local_practices').insert({
      farmer_id: params.farmerId,
      feedback_id: params.feedbackId,
      session_id: params.sessionId,
      crop_type: params.cropType.toLowerCase(),
      district: (params.district ?? '').toLowerCase(),
      pincode: params.pincode?.replace(/\D/g, '').slice(0, 6) || null,
      village: params.village ?? null,
      problem_label: params.problemLabel.slice(0, 200),
      farmer_practice: params.farmerPractice.slice(0, 500),
      outcome: params.outcome ?? null,
      verified_by: params.verifiedBy,
      metadata: { source: 'farmer_experience_learning' },
    });
    throwIfSupabaseError(error, 'Could not record local practice');
  },

  async listForCropDistrict(cropType: string, district: string | null, limit = 5) {
    let q = supabase
      .from('local_practices')
      .select('problem_label, farmer_practice, outcome, district, created_at')
      .eq('crop_type', cropType.toLowerCase())
      .eq('agronomist_verified', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (district) q = q.eq('district', district.toLowerCase());

    const { data, error } = await q;
    throwIfSupabaseError(error, 'Could not list local practices');
    return data ?? [];
  },

  async hintsForDiagnosis(farmerId: string, cropType: string): Promise<string | null> {
    const { data: farmer } = await supabase
      .from('farmers')
      .select('district, village')
      .eq('id', farmerId)
      .maybeSingle();

    const district = farmer?.district ? String(farmer.district).toLowerCase() : '';
    const practices = await this.listForCropDistrict(cropType, district || null, 3);
    if (!practices.length) return null;

    const lines = practices.map(
      (p) =>
        `- ${p.problem_label}: ${p.farmer_practice}${p.outcome ? ` (${p.outcome})` : ''}`
    );
    const place = district || farmer?.village || 'your area';
    return `Verified local practices in ${place}:\n${lines.join('\n')}`;
  },
};
