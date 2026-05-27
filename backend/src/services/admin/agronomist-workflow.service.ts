import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { AppError, NotFoundError } from '../../lib/errors.js';
import { cropDoctorService } from '../ai/crop-doctor.service.js';
import { recommendationRecordsService } from '../core/recommendation-records.service.js';
import type { AdvisoryLanguage } from '../ai/types.js';

function formatDosage(
  items: Array<{ product: string; rate: string; method: string; frequency?: string }>
): string {
  if (!items.length) return '';
  return items
    .map((d) => `${d.product}: ${d.rate} (${d.method}${d.frequency ? `, ${d.frequency}` : ''})`)
    .join('\n');
}

export const agronomistWorkflowService = {
  async listReviewQueue(limit = 40) {
    const { data: findings, error } = await supabase
      .from('crm_field_findings')
      .select(
        'id, farmer_id, block_id, block_name, crop_type, agronomist_name, observations, disease_pest, disease_tone, action_taken, follow_up_at, photo_urls, visited_at, farmers(id, name, phone, preferred_language, district), farm_blocks(id, name, crop_type, plot_label, dap)'
      )
      .is('archived_at', null)
      .order('visited_at', { ascending: false })
      .limit(limit * 2);

    throwIfSupabaseError(error, 'Could not load field findings');

    const findingIds = (findings ?? []).map((f) => f.id);
    if (!findingIds.length) return { items: [] as unknown[] };

    const { data: recs } = await supabase
      .from('recommendation_records')
      .select('id, field_finding_id, status, issue_detected, created_at')
      .in('field_finding_id', findingIds)
      .not('status', 'in', '(rejected,cancelled)');

    const recByFinding = new Map(
      (recs ?? []).map((r) => [String(r.field_finding_id), r])
    );

    const items = (findings ?? [])
      .filter((f) => {
        const rec = recByFinding.get(String(f.id));
        return !rec || rec.status === 'draft';
      })
      .slice(0, limit)
      .map((f) => {
        const farmer = (f.farmers as unknown) as Record<string, unknown> | null;
        const block = (f.farm_blocks as unknown) as Record<string, unknown> | null;
        const rec = recByFinding.get(String(f.id));
        return {
          finding: {
            id: f.id,
            farmerId: f.farmer_id,
            blockId: f.block_id,
            blockName: f.block_name,
            cropType: f.crop_type,
            agronomistName: f.agronomist_name,
            observations: f.observations,
            diseasePest: f.disease_pest,
            diseaseTone: f.disease_tone,
            actionTaken: f.action_taken,
            followUpAt: f.follow_up_at,
            photoUrls: f.photo_urls ?? [],
            visitedAt: f.visited_at,
          },
          farmer: farmer
            ? {
                id: farmer.id,
                name: farmer.name,
                phone: farmer.phone,
                district: farmer.district,
                preferredLanguage: farmer.preferred_language ?? 'en',
              }
            : null,
          block: block
            ? {
                id: block.id,
                name: block.name,
                cropType: block.crop_type,
                plotLabel: block.plot_label,
                dap: block.dap,
              }
            : null,
          existingRecommendation: rec ?? null,
        };
      });

    return { items };
  },

  async getFindingDetail(findingId: string) {
    const { data, error } = await supabase
      .from('crm_field_findings')
      .select(
        '*, farmers(id, name, phone, preferred_language, district), farm_blocks(id, name, crop_type, plot_label, dap, planting_date)'
      )
      .eq('id', findingId)
      .maybeSingle();

    throwIfSupabaseError(error, 'Could not load field finding');
    if (!data) throw new NotFoundError('Field finding not found');

    const { data: rec } = await supabase
      .from('recommendation_records')
      .select('*')
      .eq('field_finding_id', findingId)
      .not('status', 'in', '(rejected,cancelled)')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return { finding: data, recommendation: rec };
  },

  async generateAiSuggestion(findingId: string) {
    const { finding, recommendation } = await this.getFindingDetail(findingId);
    const farmer = (finding.farmers as unknown) as Record<string, unknown> | null;
    if (!farmer?.id) throw new NotFoundError('Farmer not found for finding');

    const lang = (String(farmer.preferred_language ?? 'en').slice(0, 2) as AdvisoryLanguage) || 'en';
    const symptoms = [
      finding.observations,
      finding.disease_pest ? `Disease/pest: ${finding.disease_pest}` : null,
      finding.action_taken ? `Action taken on visit: ${finding.action_taken}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const block = (finding.farm_blocks as unknown) as Record<string, unknown> | null;
    const cropType = String(finding.crop_type ?? block?.crop_type ?? 'ginger');

    const result = await cropDoctorService.diagnose({
      farmerId: String(farmer.id),
      phone: farmer.phone ? String(farmer.phone) : undefined,
      cropType,
      cropStage: block?.dap != null ? `DAP ${block.dap}` : undefined,
      language: ['en', 'ml', 'ta', 'kn', 'hi'].includes(lang) ? lang : 'en',
      symptomsText: symptoms || 'Field visit — agronomist review requested',
      channel: 'api',
    });

    const advisory = result.advisory;
    const recText =
      lang === 'ml' && advisory.farmerSummaryMl
        ? advisory.farmerSummaryMl
        : advisory.farmerSummaryEn || advisory.probableIssue;

    const dosage = formatDosage(advisory.dosageGuidance);
    const precautions =
      advisory.precautions.length > 0 ? advisory.precautions.join(' ') : undefined;

    return {
      sessionId: result.sessionId,
      escalated: result.escalated,
      escalationId: result.escalationId,
      advisory: {
        probableIssue: advisory.probableIssue,
        confidence: advisory.confidence,
        uncertain: advisory.uncertain,
        farmerSummaryEn: advisory.farmerSummaryEn,
        farmerSummaryMl: advisory.farmerSummaryMl,
        treatments: advisory.treatments,
        dosageGuidance: advisory.dosageGuidance,
        precautions: advisory.precautions,
      },
      productRecommendations: result.productRecommendations,
      suggested: {
        issueDetected: advisory.probableIssue,
        recommendationText: recText,
        dosage: dosage || undefined,
        weatherWarning: precautions,
        products: result.productRecommendations,
        language: lang,
      },
      existingRecommendationId: recommendation?.id ?? null,
    };
  },

  async saveDraft(input: {
    findingId: string;
    farmerId: string;
    blockId?: string;
    leadId?: string;
    aiSessionId?: string;
    issueDetected?: string;
    recommendationText: string;
    products?: unknown[];
    dosage?: string;
    applicationType?: string;
    weatherWarning?: string;
    language?: string;
    createdBy: string;
    recommendationId?: string;
  }) {
    if (input.recommendationId) {
      return recommendationRecordsService.updateDraft(input.recommendationId, {
        issueDetected: input.issueDetected,
        recommendationText: input.recommendationText,
        products: input.products,
        dosage: input.dosage,
        applicationType: input.applicationType,
        weatherWarning: input.weatherWarning,
        language: input.language,
        blockId: input.blockId,
      });
    }

    return recommendationRecordsService.create({
      farmerId: input.farmerId,
      blockId: input.blockId,
      leadId: input.leadId,
      aiSessionId: input.aiSessionId,
      fieldFindingId: input.findingId,
      source: 'field_finding',
      issueDetected: input.issueDetected,
      recommendationText: input.recommendationText,
      products: input.products,
      dosage: input.dosage,
      applicationType: input.applicationType,
      weatherWarning: input.weatherWarning,
      language: input.language,
      createdBy: input.createdBy,
      status: 'draft',
    });
  },

  async submitForApproval(recommendationId: string, reviewedBy: string) {
    const row = await recommendationRecordsService.getById(recommendationId);
    if (!row) throw new NotFoundError('Recommendation not found');
    if (row.status !== 'draft') {
      throw new AppError('Only drafts can be submitted', 400, 'INVALID_STATUS');
    }
    return recommendationRecordsService.submitForApproval(recommendationId, reviewedBy);
  },

  async listAgronomistSubmissions(status?: string, limit = 50) {
    if (!status || status === 'all') {
      return recommendationRecordsService.listByStatus(
        ['draft', 'pending_approval', 'approved', 'communicated', 'rejected'],
        limit
      );
    }
    return recommendationRecordsService.listByStatus(
      status as 'draft' | 'pending_approval',
      limit
    );
  },
};
