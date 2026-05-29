import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError } from '../../lib/errors.js';
import { aiReuseService, buildSymptomKey } from '../ai/ai-reuse.service.js';
import type { StructuredAdvisory } from '../ai/types.js';
import { blockService } from './block.service.js';
import { createTelecallerTask } from '../whatsapp/pipeline/telecaller-tasks.service.js';
import { farmerExperienceWeightService, trustWeightFromStats } from './farmer-experience-weight.service.js';
import { localPracticesService } from './local-practices.service.js';
import { weatherAlertsService } from '../whatsapp/scenarios/weather-alerts.service.js';
import type { AdvisoryLanguage } from '../ai/types.js';
import { env } from '../../config/env.js';

export type FarmerFeedbackStatus = 'pending_capture' | 'pending_review' | 'approved' | 'rejected' | 'partial';

export type FarmerFeedbackRow = {
  id: string;
  farmer_id: string;
  session_id: string | null;
  block_id: string | null;
  ai_probable_issue: string | null;
  ai_confidence: number | null;
  farmer_suggested_diagnosis: string | null;
  farmer_prior_experience: string | null;
  farmer_prior_product: string | null;
  farmer_prior_outcome: string | null;
  crop_experience_years: number | null;
  status: FarmerFeedbackStatus;
  capture_step: string | null;
  agronomist_final_diagnosis: string | null;
  agronomist_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  escalation_id: string | null;
  confidence_adjustment: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function mapRow(r: Record<string, unknown>): FarmerFeedbackRow {
  return {
    id: String(r.id),
    farmer_id: String(r.farmer_id),
    session_id: r.session_id ? String(r.session_id) : null,
    block_id: r.block_id ? String(r.block_id) : null,
    ai_probable_issue: r.ai_probable_issue ? String(r.ai_probable_issue) : null,
    ai_confidence: r.ai_confidence != null ? Number(r.ai_confidence) : null,
    farmer_suggested_diagnosis: r.farmer_suggested_diagnosis ? String(r.farmer_suggested_diagnosis) : null,
    farmer_prior_experience: r.farmer_prior_experience ? String(r.farmer_prior_experience) : null,
    farmer_prior_product: r.farmer_prior_product ? String(r.farmer_prior_product) : null,
    farmer_prior_outcome: r.farmer_prior_outcome ? String(r.farmer_prior_outcome) : null,
    crop_experience_years:
      r.crop_experience_years != null ? Number(r.crop_experience_years) : null,
    status: String(r.status) as FarmerFeedbackStatus,
    capture_step: r.capture_step ? String(r.capture_step) : null,
    agronomist_final_diagnosis: r.agronomist_final_diagnosis ? String(r.agronomist_final_diagnosis) : null,
    agronomist_notes: r.agronomist_notes ? String(r.agronomist_notes) : null,
    reviewed_by: r.reviewed_by ? String(r.reviewed_by) : null,
    reviewed_at: r.reviewed_at ? String(r.reviewed_at) : null,
    escalation_id: r.escalation_id ? String(r.escalation_id) : null,
    confidence_adjustment: r.confidence_adjustment != null ? Number(r.confidence_adjustment) : null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

export const farmerExperienceLearningService = {
  async createFromDisagreement(params: {
    farmerId: string;
    sessionId: string | null;
    blockId?: string | null;
    aiProbableIssue?: string | null;
    aiConfidence?: number | null;
    initialFarmerDiagnosis?: string | null;
    initialText?: string;
  }): Promise<FarmerFeedbackRow> {
    const { data, error } = await supabase
      .from('farmer_advisory_feedback')
      .insert({
        farmer_id: params.farmerId,
        session_id: params.sessionId,
        block_id: params.blockId ?? null,
        ai_probable_issue: params.aiProbableIssue ?? null,
        ai_confidence: params.aiConfidence ?? null,
        farmer_suggested_diagnosis: params.initialFarmerDiagnosis ?? null,
        farmer_prior_experience: params.initialText?.slice(0, 1000) ?? null,
        status: 'pending_capture',
        capture_step: params.initialFarmerDiagnosis ? 'experience' : 'diagnosis',
        metadata: { source: 'whatsapp_disagreement' },
      })
      .select()
      .single();

    throwIfSupabaseError(error, 'Could not create farmer feedback');
    return mapRow(data as Record<string, unknown>);
  },

  async updateCapture(id: string, patch: Partial<FarmerFeedbackRow>): Promise<FarmerFeedbackRow> {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.farmer_suggested_diagnosis !== undefined) {
      row.farmer_suggested_diagnosis = patch.farmer_suggested_diagnosis;
    }
    if (patch.farmer_prior_experience !== undefined) {
      row.farmer_prior_experience = patch.farmer_prior_experience;
    }
    if (patch.farmer_prior_product !== undefined) row.farmer_prior_product = patch.farmer_prior_product;
    if (patch.farmer_prior_outcome !== undefined) row.farmer_prior_outcome = patch.farmer_prior_outcome;
    if (patch.crop_experience_years !== undefined) {
      row.crop_experience_years = patch.crop_experience_years;
    }
    if (patch.capture_step !== undefined) row.capture_step = patch.capture_step;
    if (patch.status !== undefined) row.status = patch.status;

    const { data, error } = await supabase
      .from('farmer_advisory_feedback')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    throwIfSupabaseError(error, 'Could not update farmer feedback');
    return mapRow(data as Record<string, unknown>);
  },

  async submitForReview(feedbackId: string): Promise<FarmerFeedbackRow> {
    const fb = await this.getById(feedbackId);

    const { data: esc, error: escErr } = await supabase
      .from('agronomist_escalations')
      .insert({
        session_id: fb.session_id,
        farmer_id: fb.farmer_id,
        reason: `Farmer experience feedback: suggested "${fb.farmer_suggested_diagnosis ?? '—'}" vs AI "${fb.ai_probable_issue ?? '—'}"`,
        confidence_at_escalation: fb.ai_confidence ?? 0.5,
        priority: 'high',
        status: 'pending',
      })
      .select('id')
      .single();

    throwIfSupabaseError(escErr, 'Could not create escalation for feedback');

    const { data, error } = await supabase
      .from('farmer_advisory_feedback')
      .update({
        status: 'pending_review',
        capture_step: 'done',
        escalation_id: esc?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', feedbackId)
      .select()
      .single();

    throwIfSupabaseError(error, 'Could not submit feedback');
    const row = mapRow(data as Record<string, unknown>);

    const { data: sess } = fb.session_id
      ? await supabase.from('ai_advisory_sessions').select('crop_type').eq('id', fb.session_id).maybeSingle()
      : { data: null };
    await farmerExperienceWeightService
      .onFeedbackSubmitted(fb.farmer_id, sess?.crop_type ? String(sess.crop_type) : undefined)
      .catch(() => {});

    await createTelecallerTask({
      farmerId: fb.farmer_id,
      title: 'Farmer corrected AI diagnosis — agronomist review',
      notes: [
        `Farmer: ${fb.farmer_suggested_diagnosis ?? '—'}`,
        fb.farmer_prior_product ? `Prior product: ${fb.farmer_prior_product}` : null,
        fb.farmer_prior_outcome ? `Outcome: ${fb.farmer_prior_outcome}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      priority: 'high',
    }).catch(() => {});

    return row;
  },

  async getById(id: string): Promise<FarmerFeedbackRow> {
    const { data, error } = await supabase
      .from('farmer_advisory_feedback')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundError('Farmer feedback not found');
    return mapRow(data as Record<string, unknown>);
  },

  async listPendingReview(limit = 40): Promise<
    Array<
      FarmerFeedbackRow & {
        farmer?: { name: string | null; phone: string | null; district: string | null };
        session?: { crop_type: string | null; symptoms_text: string | null };
      }
    >
  > {
    const { data, error } = await supabase
      .from('farmer_advisory_feedback')
      .select(
        `*, farmers(name, phone, district), ai_advisory_sessions(crop_type, symptoms_text, crop_stage)`
      )
      .in('status', ['pending_review', 'partial'])
      .order('created_at', { ascending: false })
      .limit(limit);

    throwIfSupabaseError(error, 'Could not list farmer feedback');

    return (data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      const farmer = r.farmers as Record<string, unknown> | null;
      const session = r.ai_advisory_sessions as Record<string, unknown> | null;
      return {
        ...mapRow(r),
        farmer: farmer
          ? {
              name: farmer.name ? String(farmer.name) : null,
              phone: farmer.phone ? String(farmer.phone) : null,
              district: farmer.district ? String(farmer.district) : null,
            }
          : undefined,
        session: session
          ? {
              crop_type: session.crop_type ? String(session.crop_type) : null,
              symptoms_text: session.symptoms_text ? String(session.symptoms_text) : null,
            }
          : undefined,
      };
    });
  },

  async getDetail(id: string) {
    const fb = await this.getById(id);

    const { data: session } = fb.session_id
      ? await supabase
          .from('ai_advisory_sessions')
          .select(`*, ai_advisory_outputs(*)`)
          .eq('id', fb.session_id)
          .maybeSingle()
      : { data: null };

    const outputs = (session?.ai_advisory_outputs as unknown[]) ?? [];
    const latestOutput = outputs[0] as Record<string, unknown> | undefined;

    const sessionCreated = session?.created_at ? String(session.created_at) : null;
    const { data: imageLogs } = await supabase
      .from('interaction_logs')
      .select('id, message_type, content, created_at, raw_payload')
      .eq('farmer_id', fb.farmer_id)
      .in('message_type', ['image', 'image_message', 'document'])
      .order('created_at', { ascending: false })
      .limit(8);

    const sessionImages = (imageLogs ?? [])
      .filter((log) => {
        if (!sessionCreated) return true;
        const t = new Date(String(log.created_at)).getTime();
        const s = new Date(sessionCreated).getTime();
        return Math.abs(t - s) < 48 * 60 * 60 * 1000;
      })
      .slice(0, 4)
      .map((log) => ({
        id: String(log.id),
        messageType: String(log.message_type),
        at: String(log.created_at),
        caption: log.content ? String(log.content).slice(0, 200) : null,
      }));

    let imageUrl: string | null = null;
    const storagePath = session?.image_storage_path ? String(session.image_storage_path) : null;
    if (storagePath) {
      const { data: pub } = supabase.storage.from('advisory-images').getPublicUrl(storagePath);
      imageUrl = pub?.publicUrl ?? null;
    }

    const { data: farmerRow } = await supabase
      .from('farmers')
      .select('preferred_language, district, village, crop_experience_years, pincode_master(pincode)')
      .eq('id', fb.farmer_id)
      .maybeSingle();

    const lang = (farmerRow?.preferred_language ?? 'en') as AdvisoryLanguage;
    let weatherSummary: string | null = null;
    try {
      weatherSummary = await weatherAlertsService.formatForFarmer(fb.farmer_id, lang);
      if (weatherSummary.length > 600) {
        weatherSummary = `${weatherSummary.slice(0, 597)}…`;
      }
    } catch {
      weatherSummary = null;
    }

    const experienceStats = await farmerExperienceWeightService.getOrCreate(fb.farmer_id);

    let block: { name: string; crop_type: string; dap: number | null } | null = null;
    if (fb.block_id) {
      const b = await blockService.getById(fb.block_id, fb.farmer_id);
      if (b) block = { name: b.name, crop_type: b.crop_type, dap: b.dap };
    } else {
      const primary = await blockService.getPrimaryBlock(fb.farmer_id);
      if (primary) block = { name: primary.name, crop_type: primary.crop_type, dap: primary.dap };
    }

    const { data: similar } = await supabase
      .from('farmer_advisory_feedback')
      .select('id, farmer_suggested_diagnosis, farmer_prior_product, status, created_at')
      .eq('status', 'approved')
      .ilike('farmer_suggested_diagnosis', `%${(fb.farmer_suggested_diagnosis ?? '').slice(0, 40)}%`)
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(5);

    const pm = farmerRow?.pincode_master as { pincode?: string } | null;

    return {
      feedback: fb,
      block,
      session: session
        ? {
            id: String(session.id),
            cropType: session.crop_type ? String(session.crop_type) : null,
            cropStage: session.crop_stage ? String(session.crop_stage) : null,
            symptomsText: session.symptoms_text ? String(session.symptoms_text) : null,
            voiceTranscript: session.voice_transcript ? String(session.voice_transcript) : null,
            confidence: session.confidence_score != null ? Number(session.confidence_score) : null,
            createdAt: sessionCreated,
            imageStoragePath: storagePath,
            imageUrl,
          }
        : null,
      sessionImages,
      weatherSummary,
      experienceStats,
      farmerProfile: farmerRow
        ? {
            cropExperienceYears:
              farmerRow.crop_experience_years != null
                ? Number(farmerRow.crop_experience_years)
                : fb.crop_experience_years,
            district: farmerRow.district ? String(farmerRow.district) : null,
            village: farmerRow.village ? String(farmerRow.village) : null,
            pincode: pm?.pincode ?? null,
          }
        : null,
      aiOutput: latestOutput
        ? {
            probableIssue: latestOutput.probable_issue,
            summaryEn: latestOutput.farmer_summary_en,
            summaryMl: latestOutput.farmer_summary_ml,
            treatments: latestOutput.treatment_recommendations,
          }
        : null,
      similarApproved: similar ?? [],
      consoleSessionUrl: fb.session_id
        ? `${env.API_BASE_URL ?? ''}/morbeez-staff`.replace(/\/$/, '')
        : null,
    };
  },

  async review(
    id: string,
    body: {
      decision: 'approved' | 'rejected' | 'partial';
      agronomistFinalDiagnosis?: string;
      agronomistNotes?: string;
      confidenceAdjustment?: number;
      updatedRecommendation?: string;
    },
    agentEmail: string
  ): Promise<FarmerFeedbackRow> {
    const fb = await this.getById(id);
    if (fb.status !== 'pending_review' && fb.status !== 'partial') {
      throw new NotFoundError('Feedback is not awaiting review');
    }

    const status = body.decision;
    const finalDx =
      body.agronomistFinalDiagnosis?.trim() ||
      (status === 'approved' ? fb.farmer_suggested_diagnosis : null) ||
      fb.ai_probable_issue;

    const metaPatch = { ...fb.metadata };
    if (body.updatedRecommendation?.trim()) {
      metaPatch.updated_recommendation = body.updatedRecommendation.trim().slice(0, 4000);
    }

    const { data, error } = await supabase
      .from('farmer_advisory_feedback')
      .update({
        status,
        agronomist_final_diagnosis: finalDx,
        agronomist_notes: body.agronomistNotes?.trim() ?? null,
        reviewed_by: agentEmail,
        reviewed_at: new Date().toISOString(),
        confidence_adjustment: body.confidenceAdjustment ?? (status === 'approved' ? 0.85 : null),
        metadata: metaPatch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    throwIfSupabaseError(error, 'Could not review feedback');
    const row = mapRow(data as Record<string, unknown>);

    await farmerExperienceWeightService.onFeedbackReviewed(fb.farmer_id, status).catch(() => {});

    if (status === 'approved' || status === 'partial') {
      await this.promoteToVerifiedLearning(row, agentEmail);
    }

    if (fb.escalation_id) {
      await supabase
        .from('agronomist_escalations')
        .update({
          status: 'resolved',
          resolution: status,
          agronomist_notes: body.agronomistNotes ?? null,
          correction: {
            farmerSuggested: fb.farmer_suggested_diagnosis,
            agronomistFinal: finalDx,
            priorProduct: fb.farmer_prior_product,
            decision: status,
          },
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', fb.escalation_id);
    }

    return row;
  },

  async getVerifiedRegionalHints(farmerId: string, cropType: string): Promise<string | null> {
    const practiceHints = await localPracticesService.hintsForDiagnosis(farmerId, cropType);
    const { data: farmer } = await supabase
      .from('farmers')
      .select('district')
      .eq('id', farmerId)
      .maybeSingle();

    let query = supabase
      .from('farmer_advisory_feedback')
      .select(
        'agronomist_final_diagnosis, farmer_prior_product, farmer_suggested_diagnosis, ai_advisory_sessions(crop_type)'
      )
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data, error } = await query;
    if (error || !data?.length) return null;

    const crop = cropType.toLowerCase();
    const lines = data
      .filter((row) => {
        const sess = row.ai_advisory_sessions as { crop_type?: string } | null;
        return !sess?.crop_type || String(sess.crop_type).toLowerCase() === crop;
      })
      .slice(0, 3)
      .map((row) => {
        const dx = row.agronomist_final_diagnosis ?? row.farmer_suggested_diagnosis ?? 'issue';
        const prod = row.farmer_prior_product ? ` (prior: ${row.farmer_prior_product})` : '';
        return `- Verified: ${dx}${prod}`;
      });

    const district = farmer?.district ? String(farmer.district) : 'your region';
    const feedbackBlock =
      lines.length > 0
        ? `Similar verified farmer cases in ${district}:\n${lines.join('\n')}`
        : null;
    if (practiceHints && feedbackBlock) {
      return `${feedbackBlock}\n\n${practiceHints}`;
    }
    return practiceHints ?? feedbackBlock;
  },

  async saveCropExperienceYears(farmerId: string, years: number, feedbackId?: string): Promise<void> {
    const y = Math.min(60, Math.max(0, Math.floor(years)));
    await supabase
      .from('farmers')
      .update({ crop_experience_years: y, updated_at: new Date().toISOString() })
      .eq('id', farmerId);
    if (feedbackId) {
      await supabase
        .from('farmer_advisory_feedback')
        .update({ crop_experience_years: y, updated_at: new Date().toISOString() })
        .eq('id', feedbackId);
    }
  },

  async promoteToVerifiedLearning(fb: FarmerFeedbackRow, agentEmail: string): Promise<void> {
    if (!fb.session_id || !fb.agronomist_final_diagnosis) return;

    const { data: session } = await supabase
      .from('ai_advisory_sessions')
      .select('id, crop_type')
      .eq('id', fb.session_id)
      .maybeSingle();

    const cropType = session?.crop_type ? String(session.crop_type) : 'ginger';
    const { data: farmer } = await supabase
      .from('farmers')
      .select('district')
      .eq('id', fb.farmer_id)
      .maybeSingle();

    const primary = await blockService.getPrimaryBlock(fb.farmer_id);
    const dap = primary?.dap ?? 0;
    const symptomKey = buildSymptomKey(
      fb.farmer_suggested_diagnosis ?? undefined,
      fb.farmer_prior_experience ?? undefined,
      fb.ai_probable_issue ?? undefined
    );

    const stats = await farmerExperienceWeightService.getOrCreate(fb.farmer_id);
    const trustW = trustWeightFromStats(stats, fb.crop_experience_years);
    let baseConfidence = fb.confidence_adjustment ?? 0.82;
    baseConfidence = Math.min(0.95, baseConfidence * trustW);

    const advisory: StructuredAdvisory = {
      probableIssue: fb.agronomist_final_diagnosis,
      confidence: baseConfidence,
      uncertain: false,
      nutrientDeficiency: [],
      stressAnalysis: [],
      treatments: fb.farmer_prior_product
        ? [
            {
              action: `Prior successful: ${fb.farmer_prior_product}`,
              productType: 'farmer_verified',
              timing: fb.farmer_prior_outcome ?? 'as per field experience',
            },
          ]
        : [],
      dosageGuidance: [],
      precautions: ['Validated by agronomist from farmer field experience.'],
      escalationRecommended: false,
      farmerSummaryEn: `Verified regional case: ${fb.agronomist_final_diagnosis}. ${
        fb.farmer_prior_product ? `Farmer reported ${fb.farmer_prior_product} helped.` : ''
      }`,
      farmerSummaryMl: `സ്ഥിരീകരിച്ച കേസ്: ${fb.agronomist_final_diagnosis}`,
      recommendedProductTags: [],
    };

    await aiReuseService.indexSuccessfulCase({
      sessionId: fb.session_id,
      farmerId: fb.farmer_id,
      cropType,
      district: farmer?.district ? String(farmer.district).toLowerCase() : null,
      dap,
      symptomKey,
      advisory,
      products: [],
      escalated: false,
    });

    const { data: pmFarmer } = await supabase
      .from('farmers')
      .select('district, village, pincode_master(pincode)')
      .eq('id', fb.farmer_id)
      .maybeSingle();
    const pinRow = pmFarmer?.pincode_master as { pincode?: string } | null;

    if (fb.farmer_prior_product || fb.agronomist_final_diagnosis) {
      await localPracticesService.recordFromFeedback({
        feedbackId: fb.id,
        farmerId: fb.farmer_id,
        sessionId: fb.session_id,
        cropType,
        district: pmFarmer?.district ? String(pmFarmer.district) : null,
        pincode: pinRow?.pincode ?? null,
        village: pmFarmer?.village ? String(pmFarmer.village) : null,
        problemLabel: fb.agronomist_final_diagnosis,
        farmerPractice: fb.farmer_prior_product ?? fb.farmer_prior_experience ?? 'field practice',
        outcome: fb.farmer_prior_outcome,
        verifiedBy: agentEmail,
      });
    }

    await supabase.from('farmer_advisory_feedback').update({
      metadata: {
        ...fb.metadata,
        promoted_to_reuse: true,
        promoted_at: new Date().toISOString(),
        trust_weight: trustW,
      },
      updated_at: new Date().toISOString(),
    }).eq('id', fb.id);
  },
};
