import { supabase } from '../../lib/supabase.js';
import { escalationAdminService } from './escalation-admin.service.js';
import { blockService } from '../core/block.service.js';
import { recommendationRecordsService } from '../core/recommendation-records.service.js';
import { agronomistWorkflowService } from './agronomist-workflow.service.js';
import { weatherAlertsService } from '../whatsapp/scenarios/weather-alerts.service.js';
import type { AdvisoryLanguage } from '../ai/types.js';
import {
  resolveAdvisoryImageUrl,
  urlFromWhatsAppPayload,
} from '../core/advisory-image-storage.service.js';

function formatDt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${Math.max(1, m)}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function caseRef(id: string, createdAt: string): string {
  const d = new Date(createdAt);
  const y = d.getFullYear().toString().slice(-2);
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `ESC-${y}${mo}${day}-${id.replace(/-/g, '').slice(0, 4).toUpperCase()}`;
}

function priorityRank(p: string): number {
  if (p === 'urgent') return 0;
  if (p === 'high') return 1;
  if (p === 'normal') return 2;
  return 3;
}

async function pushFarmerImage(
  images: Array<{ id: string; url: string | null; caption: string | null; at: string }>,
  row: { id: string; url: string | null; caption: string | null; at: string }
): Promise<void> {
  if (!row.url) return;
  if (images.some((i) => i.url === row.url)) return;
  images.push(row);
}

type AiDiagnosisRow = { label: string; confidence: number };

function buildTopDiagnoses(
  probableIssue: string | null | undefined,
  confidence: number | null | undefined,
  plantIdRaw: unknown,
  stressAnalysis: unknown
): AiDiagnosisRow[] {
  const rows: AiDiagnosisRow[] = [];
  const baseConf = confidence != null ? Number(confidence) : 0.66;

  if (probableIssue) {
    rows.push({ label: probableIssue, confidence: baseConf });
  }

  const plant = plantIdRaw as { diseases?: Array<{ name: string; probability: number }> } | null;
  for (const d of plant?.diseases ?? []) {
    if (!d.name) continue;
    if (rows.some((r) => r.label.toLowerCase() === d.name.toLowerCase())) continue;
    rows.push({ label: d.name, confidence: d.probability ?? 0.25 });
  }

  const stress = Array.isArray(stressAnalysis) ? stressAnalysis : [];
  for (const s of stress.slice(0, 2)) {
    const label = typeof s === 'string' ? s : String(s);
    if (!label || rows.some((r) => r.label === label)) continue;
    rows.push({ label, confidence: Math.max(0.12, baseConf * 0.45) });
  }

  if (!rows.length && probableIssue) {
    rows.push({ label: probableIssue, confidence: baseConf });
  }

  const total = rows.reduce((s, r) => s + r.confidence, 0) || 1;
  return rows
    .slice(0, 3)
    .map((r) => ({ ...r, confidence: r.confidence / total }))
    .sort((a, b) => b.confidence - a.confidence);
}

function confidenceBreakdown(
  confidence: number | null,
  cropMatch: boolean,
  hasImages: boolean,
  hasWeather: boolean
) {
  const base = confidence ?? 0.66;
  return [
    { label: 'Crop match', score: cropMatch ? 0.92 : 0.55 },
    { label: 'Visual match', score: hasImages ? Math.min(0.95, base + 0.08) : 0.4 },
    { label: 'Weather match', score: hasWeather ? 0.78 : 0.5 },
    { label: 'Regional history', score: Math.min(0.88, base + 0.05) },
    { label: 'Overall', score: base },
  ];
}

export const agronomistCaseReviewService = {
  async listQueue(params: {
    status?: string;
    sort?: 'priority' | 'newest';
    page?: number;
    limit?: number;
  }) {
    const status = params.status ?? 'pending';
    const limit = Math.min(params.limit ?? 24, 50);
    const page = params.page ?? 1;

    const { items, total } = await escalationAdminService.list({
      status: status === 'all' ? 'all' : status,
      page,
      limit: limit * 2,
    });

    let sorted = [...items];
    if (params.sort === 'priority') {
      sorted.sort((a, b) => {
        const pr = priorityRank(String(a.priority)) - priorityRank(String(b.priority));
        if (pr !== 0) return pr;
        return new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime();
      });
    }
    sorted = sorted.slice(0, limit);

    const farmerIds = [...new Set(sorted.map((i) => String(i.farmerId)))];
    const { data: farmerSources } = farmerIds.length
      ? await supabase.from('farmers').select('id, source').in('id', farmerIds)
      : { data: [] as { id: string; source: string | null }[] };
    const demoFarmerIds = new Set(
      (farmerSources ?? []).filter((f) => f.source === 'demo_seed').map((f) => String(f.id))
    );
    sorted = sorted.filter((i) => !demoFarmerIds.has(String(i.farmerId)));

    const enriched = await Promise.all(
      sorted.map(async (item) => {
        const primary = await blockService.getPrimaryBlock(String(item.farmerId));
        const { data: fb } = await supabase
          .from('farmer_advisory_feedback')
          .select('id, status')
          .eq('session_id', item.sessionId)
          .in('status', ['pending_review', 'partial', 'pending_capture'])
          .limit(1)
          .maybeSingle();

        return {
          id: item.id,
          caseRef: caseRef(item.id, String(item.createdAt)),
          farmerName: item.farmerName,
          farmerPhone: item.farmerPhone,
          cropType: item.cropType ?? primary?.crop_type ?? '—',
          dap: primary?.dap ?? null,
          confidence: item.confidence != null ? Number(item.confidence) : null,
          priority: item.priority,
          status: item.status,
          reason: item.reason,
          createdAt: item.createdAt,
          createdLabel: item.createdLabel,
          timeAgo: timeAgo(String(item.createdAt)),
          farmerDisagrees: Boolean(fb),
          feedbackId: fb?.id ?? null,
        };
      })
    );

    return { items: enriched, total, page, limit };
  },

  async getCaseDetail(escalationId: string) {
    const esc = await escalationAdminService.getById(escalationId);

    const { data: sessionRow } = await supabase
      .from('ai_advisory_sessions')
      .select('*, ai_advisory_outputs(*)')
      .eq('id', esc.sessionId)
      .maybeSingle();

    const outputs = (sessionRow?.ai_advisory_outputs as unknown[]) ?? [];
    const latestOutput = outputs[0] as Record<string, unknown> | undefined;
    const plantId = sessionRow?.plant_id_result;

    const sessionCreated = sessionRow?.created_at ? String(sessionRow.created_at) : null;

    const { data: imageLogs } = await supabase
      .from('interaction_logs')
      .select('id, message_type, content, created_at, raw_payload')
      .eq('farmer_id', esc.farmerId)
      .in('message_type', ['image', 'image_message', 'document'])
      .order('created_at', { ascending: false })
      .limit(12);

    const images: Array<{ id: string; url: string; caption: string | null; at: string }> = [];
    const mainPath = sessionRow?.image_storage_path ? String(sessionRow.image_storage_path) : null;
    if (mainPath) {
      const url = await resolveAdvisoryImageUrl(mainPath);
      await pushFarmerImage(images, {
        id: 'session-main',
        url,
        caption: sessionRow?.symptoms_text ? String(sessionRow.symptoms_text).slice(0, 120) : null,
        at: sessionCreated ?? new Date().toISOString(),
      });
    }

    for (const log of imageLogs ?? []) {
      if (images.length >= 6) break;
      const payload = (log.raw_payload as Record<string, unknown>) ?? {};
      const path =
        (payload.storagePath as string) ||
        (payload.image_storage_path as string) ||
        (payload.path as string) ||
        null;
      let url = path ? await resolveAdvisoryImageUrl(path) : null;
      if (!url) url = urlFromWhatsAppPayload(payload);
      if (!url) continue;
      const t = new Date(String(log.created_at)).getTime();
      if (sessionCreated) {
        const s = new Date(sessionCreated).getTime();
        if (Math.abs(t - s) > 72 * 60 * 60 * 1000) continue;
      }
      await pushFarmerImage(images, {
        id: String(log.id),
        url,
        caption: log.content ? String(log.content).slice(0, 200) : null,
        at: String(log.created_at),
      });
    }

    const primary = await blockService.getPrimaryBlock(esc.farmerId);
    const lang = (esc.farmer?.language ?? 'en') as AdvisoryLanguage;

    let weatherSummary: string | null = null;
    try {
      weatherSummary = await weatherAlertsService.formatForFarmer(esc.farmerId, lang);
      if (weatherSummary.length > 400) weatherSummary = `${weatherSummary.slice(0, 397)}…`;
    } catch {
      weatherSummary = null;
    }

    const { data: soil } = await supabase
      .from('crm_soil_reports')
      .select('metrics, reported_at')
      .eq('farmer_id', esc.farmerId)
      .order('reported_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: lastApp } = await supabase
      .from('recommendation_applications')
      .select('technical_name, trade_name, dosage, applied_at')
      .eq('farmer_id', esc.farmerId)
      .order('applied_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: prevRec } = await supabase
      .from('recommendation_records')
      .select('issue_detected, status, outcome, created_at')
      .eq('farmer_id', esc.farmerId)
      .eq('status', 'outcome_recorded')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: feedback } = await supabase
      .from('farmer_advisory_feedback')
      .select('*')
      .eq('session_id', esc.sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const probable = latestOutput?.probable_issue
      ? String(latestOutput.probable_issue)
      : esc.session?.probableIssue
        ? String(esc.session.probableIssue)
        : null;
    const conf =
      esc.confidence ??
      (sessionRow?.confidence_score != null ? Number(sessionRow.confidence_score) : null);

    const topDiagnoses = buildTopDiagnoses(
      probable,
      conf,
      plantId,
      latestOutput?.stress_analysis
    );

    const aiSummary =
      latestOutput?.farmer_summary_en ??
      esc.session?.summaryEn ??
      sessionRow?.symptoms_text ??
      esc.reason;

    const { data: farmerRow } = await supabase
      .from('farmers')
      .select('crop_experience_years, village, state')
      .eq('id', esc.farmerId)
      .maybeSingle();

    const { data: similar } = await supabase
      .from('advisory_reuse_cases')
      .select('id, symptom_key, issue_label, district, dap_bucket, advisory_snapshot, created_at')
      .eq('crop_type', sessionRow?.crop_type ?? esc.session?.cropType ?? 'ginger')
      .order('created_at', { ascending: false })
      .limit(6);

    const { data: existingRec } = await supabase
      .from('recommendation_records')
      .select('id, status, issue_detected, recommendation_text')
      .eq('ai_session_id', esc.sessionId)
      .not('status', 'in', '(rejected,cancelled)')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const timeline: Array<{
      at: string | null;
      label: string;
      status: 'done' | 'pending';
      kind: 'whatsapp' | 'ai' | 'farmer' | 'pending';
    }> = [
      {
        at: esc.createdAt,
        label: 'Case created via WhatsApp',
        status: 'done',
        kind: 'whatsapp',
      },
      {
        at: sessionCreated,
        label: 'AI analysis completed',
        status: 'done',
        kind: 'ai',
      },
      ...(feedback
        ? [
            {
              at: String(feedback.created_at),
              label: 'Farmer disagreed with AI',
              status: 'done' as const,
              kind: 'farmer' as const,
            },
          ]
        : []),
      {
        at: null,
        label: 'Awaiting agronomist review',
        status: 'pending',
        kind: 'pending',
      },
    ];

    return {
      escalation: {
        id: esc.id,
        farmerId: esc.farmerId,
        caseRef: caseRef(esc.id, String(esc.createdAt)),
        sessionId: esc.sessionId,
        status: esc.status,
        priority: esc.priority,
        reason: esc.reason,
        confidence: conf,
        createdAt: esc.createdAt,
        createdLabel: esc.createdLabel,
        timeAgo: timeAgo(String(esc.createdAt)),
        agronomistNotes: esc.agronomistNotes,
        correction: esc.correction,
      },
      farmer: esc.farmer,
      block: primary
        ? {
            id: primary.id,
            name: primary.name,
            cropType: primary.crop_type,
            dap: primary.dap,
          }
        : null,
      location: {
        district: esc.farmer?.district ?? null,
        village: farmerRow?.village ? String(farmerRow.village) : null,
        state: farmerRow?.state ? String(farmerRow.state) : null,
        weatherSummary,
      },
      images,
      ai: {
        topDiagnoses,
        summary: aiSummary ? String(aiSummary) : '',
        probableIssue: probable,
        confidence: conf,
        treatments: latestOutput?.treatment_recommendations ?? esc.session?.treatments,
        precautions: latestOutput?.precautions ?? esc.session?.precautions,
      },
      confidenceBreakdown: confidenceBreakdown(
        conf,
        Boolean(sessionRow?.crop_type),
        images.length > 0,
        Boolean(weatherSummary)
      ),
      context: {
        lastSpray: lastApp
          ? {
              product: lastApp.trade_name ?? lastApp.technical_name ?? '—',
              dosage: lastApp.dosage,
              at: formatDt(String(lastApp.applied_at)),
              appliedAt: String(lastApp.applied_at),
            }
          : null,
        soil: soil
          ? (() => {
              const m = (soil.metrics as Record<string, unknown>) ?? {};
              return {
                ph: m.ph ?? m.pH ?? null,
                ec: m.ec ?? m.EC ?? null,
                organicCarbon: m.organic_carbon ?? m.oc ?? null,
                testedAt: formatDt(String(soil.reported_at)),
              };
            })()
          : null,
        previousIssue: prevRec
          ? {
              issue: prevRec.issue_detected,
              outcome: prevRec.outcome,
              status: prevRec.status,
            }
          : null,
        rainfallNote: weatherSummary?.includes('mm') ? weatherSummary.split('\n')[0] : null,
      },
      farmerFeedback: feedback
        ? {
            id: feedback.id,
            status: feedback.status,
            disagrees: true,
            farmerDiagnosis: feedback.farmer_suggested_diagnosis,
            farmerExperience: feedback.farmer_prior_experience,
            farmerProduct: feedback.farmer_prior_product,
            farmerOutcome: feedback.farmer_prior_outcome,
            aiIssue: feedback.ai_probable_issue,
            cropExperienceYears:
              feedback.crop_experience_years != null
                ? Number(feedback.crop_experience_years)
                : farmerRow?.crop_experience_years != null
                  ? Number(farmerRow.crop_experience_years)
                  : null,
          }
        : null,
      productRecommendations: esc.productRecommendations,
      similarCases: (similar ?? []).map((s) => {
        const snap = s.advisory_snapshot as { probableIssue?: string } | null;
        return {
          id: s.id,
          symptomKey: s.symptom_key,
          issueLabel: s.issue_label ?? snap?.probableIssue ?? String(s.symptom_key),
          district: s.district,
          dap: s.dap_bucket,
        };
      }),
      existingRecommendation: existingRec,
      timeline,
    };
  },

  async submitReview(
    escalationId: string,
    body: {
      action: 'approve_ai' | 'correct_ai' | 'partial_match' | 'escalate_urgent';
      correctDiagnosis?: string;
      severity?: 'mild' | 'moderate' | 'severe';
      recommendationText?: string;
      dosage?: string;
      notesForLearning?: string;
      submitForApproval?: boolean;
    },
    agentEmail: string
  ) {
    const detail = await this.getCaseDetail(escalationId);
    const esc = detail.escalation;

    const issue =
      body.action === 'approve_ai'
        ? String(detail.ai.probableIssue ?? 'Field issue')
        : body.correctDiagnosis?.trim() ||
          String(detail.ai.probableIssue ?? 'Field issue');

    const recText =
      body.recommendationText?.trim() ||
      detail.ai.summary ||
      `Agronomist reviewed: ${issue}`;

    let recommendationId = detail.existingRecommendation?.id
      ? String(detail.existingRecommendation.id)
      : null;

    if (recommendationId) {
      await supabase
        .from('recommendation_records')
        .update({
          issue_detected: issue,
          recommendation_text: recText,
          dosage: body.dosage ?? null,
          severity:
            body.severity === 'mild'
              ? 'low'
              : body.severity === 'severe'
                ? 'high'
                : body.severity === 'moderate'
                  ? 'medium'
                  : null,
          reviewed_by: agentEmail,
          updated_at: new Date().toISOString(),
          metadata: {
            caseReviewAction: body.action,
            notesForLearning: body.notesForLearning ?? null,
          },
        })
        .eq('id', recommendationId);
    } else {
      const row = await recommendationRecordsService.create({
        farmerId: esc.farmerId,
        blockId: detail.block?.id,
        aiSessionId: esc.sessionId,
        source: 'agronomist',
        issueDetected: issue,
        recommendationText: recText,
        dosage: body.dosage,
        language: String(detail.farmer?.language ?? 'en').slice(0, 2),
        createdBy: agentEmail,
        status: 'draft',
        severity:
          body.severity === 'mild'
            ? 'low'
            : body.severity === 'severe'
              ? 'high'
              : body.severity === 'moderate'
                ? 'medium'
                : undefined,
      });
      recommendationId = String(row.id);
    }

    const newStatus =
      body.action === 'escalate_urgent'
        ? 'in_review'
        : body.submitForApproval
          ? 'in_review'
          : 'resolved';

    const newPriority = body.action === 'escalate_urgent' ? 'urgent' : undefined;

    await escalationAdminService.update(
      escalationId,
      {
        status: newStatus,
        assignedTo: agentEmail,
        agronomistNotes: body.notesForLearning,
        resolution:
          body.action === 'approve_ai'
            ? 'AI diagnosis approved by agronomist'
            : body.action === 'partial_match'
              ? 'Partial match — agronomist correction applied'
              : body.action === 'correct_ai'
                ? 'Agronomist corrected AI diagnosis'
                : 'Escalated for senior review',
        correction: {
          action: body.action,
          correctDiagnosis: body.correctDiagnosis ?? null,
          severity: body.severity ?? null,
          recommendationId,
          reviewedAt: new Date().toISOString(),
        },
      },
      agentEmail
    );

    if (newPriority) {
      await supabase
        .from('agronomist_escalations')
        .update({ priority: newPriority, updated_at: new Date().toISOString() })
        .eq('id', escalationId);
    }

    if (body.submitForApproval && recommendationId) {
      await agronomistWorkflowService.submitForApproval(recommendationId, agentEmail);
    }

    if (
      detail.farmerFeedback &&
      (body.action === 'approve_ai' || body.action === 'partial_match' || body.action === 'correct_ai')
    ) {
      await supabase
        .from('farmer_advisory_feedback')
        .update({
          status: body.action === 'partial_match' ? 'partial' : 'approved',
          agronomist_final_diagnosis: issue,
          agronomist_notes: body.notesForLearning ?? null,
          reviewed_by: agentEmail,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', detail.farmerFeedback.id);
    }

    return {
      escalationId,
      recommendationId,
      submittedForApproval: Boolean(body.submitForApproval),
    };
  },
};
