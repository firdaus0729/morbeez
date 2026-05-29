import { supabase } from '../../lib/supabase.js';
import { logger } from '../../lib/logger.js';
import { aiReuseService, buildDapBucket, buildSymptomKey } from '../ai/ai-reuse.service.js';
import type { StructuredAdvisory } from '../ai/types.js';
import { blockService } from './block.service.js';

/**
 * Phase 5 — close the loop: staff-verified knowledge → reuse cache + terminology library.
 */
export const learningLoopService = {
  async onTerminologyResolved(params: {
    taskId: string;
    term: string;
    language: string;
    meaning: string;
    cropType?: string | null;
    district?: string | null;
    resolvedBy?: string;
    farmerId?: string | null;
  }): Promise<void> {
    const term = params.term.trim().toLowerCase();
    if (!term || !params.meaning.trim()) return;

    await supabase.from('agronomy_terms').upsert(
      {
        term,
        language: params.language || 'en',
        meaning: params.meaning.trim().slice(0, 500),
        crop_type: params.cropType ?? null,
        district: params.district ?? null,
        confidence: 0.92,
        created_by: 'agronomist',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'term,language,crop_type,district' }
    );

    if (params.farmerId) {
      const { data: farmer } = await supabase
        .from('farmers')
        .select('phone, preferred_language')
        .eq('id', params.farmerId)
        .maybeSingle();
      if (farmer?.phone) {
        const lang = farmer.preferred_language ?? params.language;
        const msg =
          lang === 'ml'
            ? `"${term}" എന്നത് ഇപ്പോൾ മനസ്സിലാക്കാം: ${params.meaning}`
            : `We learned your term "${term}": ${params.meaning}`;
        await supabase.from('interaction_logs').insert({
          farmer_id: params.farmerId,
          channel: 'whatsapp',
          direction: 'outbound',
          content: msg.slice(0, 500),
        });
      }
    }

    logger.info({ taskId: params.taskId, term }, 'Terminology promoted to agronomy_terms');
  },

  async promoteRecommendationToReuse(recommendationRecordId: string): Promise<void> {
    const { data: rec } = await supabase
      .from('recommendation_records')
      .select(
        'id, farmer_id, block_id, ai_session_id, issue_detected, recommendation_text, products, outcome, status, dap_at_recommendation, farm_blocks(crop_type)'
      )
      .eq('id', recommendationRecordId)
      .maybeSingle();

    if (!rec?.ai_session_id || !rec.farmer_id) return;
    if (rec.outcome && !['better', 'partial'].includes(String(rec.outcome))) return;

    const cropType =
      (rec.farm_blocks as { crop_type?: string } | null)?.crop_type ??
      (await blockService.getPrimaryBlock(rec.farmer_id))?.crop_type ??
      'ginger';

    const { data: session } = await supabase
      .from('ai_advisory_sessions')
      .select('id, metadata')
      .eq('id', rec.ai_session_id)
      .maybeSingle();

    const { data: output } = await supabase
      .from('ai_advisory_outputs')
      .select('*')
      .eq('session_id', rec.ai_session_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!output) return;

    const advisory: StructuredAdvisory = {
      probableIssue: String(output.probable_issue ?? rec.issue_detected ?? 'crop issue'),
      confidence: Number((session?.metadata as { confidence?: number })?.confidence ?? 0.75),
      uncertain: false,
      nutrientDeficiency: (output.nutrient_deficiency as StructuredAdvisory['nutrientDeficiency']) ?? [],
      stressAnalysis: (output.stress_analysis as string[]) ?? [],
      treatments: (output.treatment_recommendations as StructuredAdvisory['treatments']) ?? [],
      dosageGuidance: (output.dosage_guidance as StructuredAdvisory['dosageGuidance']) ?? [],
      precautions: (output.precautions as string[]) ?? [],
      escalationRecommended: false,
      farmerSummaryEn: String(output.farmer_summary_en ?? rec.recommendation_text ?? ''),
      farmerSummaryMl: String(output.farmer_summary_ml ?? output.farmer_summary_en ?? rec.recommendation_text ?? ''),
      recommendedProductTags: [],
    };

    const { data: farmer } = await supabase
      .from('farmers')
      .select('district')
      .eq('id', rec.farmer_id)
      .maybeSingle();

    const dap = rec.dap_at_recommendation ?? 0;
    const symptomKey = buildSymptomKey(rec.issue_detected ?? undefined, rec.recommendation_text);

    await aiReuseService.indexSuccessfulCase({
      sessionId: rec.ai_session_id,
      farmerId: rec.farmer_id,
      cropType,
      district: farmer?.district ? String(farmer.district).toLowerCase() : null,
      dap,
      symptomKey,
      advisory,
      products: (rec.products as []) ?? [],
      escalated: false,
    });

    logger.info({ recommendationRecordId, symptomKey, dapBucket: buildDapBucket(dap) }, 'Promoted to advisory_reuse_cases');
  },

  async onLearningSampleReady(recommendationRecordId: string): Promise<void> {
    const { data: sample } = await supabase
      .from('ai_learning_samples')
      .select('application_confirmed, outcome, escalated')
      .eq('recommendation_record_id', recommendationRecordId)
      .maybeSingle();

    if (!sample?.application_confirmed) return;
    if (sample.escalated) return;
    if (!sample.outcome || ['worsened', 'no_improvement'].includes(String(sample.outcome))) return;

    await this.promoteRecommendationToReuse(recommendationRecordId);
  },
};
