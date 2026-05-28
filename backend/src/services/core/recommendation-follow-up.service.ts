import { env } from '../../config/env.js';
import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { logger } from '../../lib/logger.js';
import { whatsappService } from '../whatsapp/whatsapp.service.js';
import { recommendationRecordsService } from './recommendation-records.service.js';
import { createTelecallerTask } from '../whatsapp/pipeline/telecaller-tasks.service.js';
import { cultivationLoggingService } from '../whatsapp/cultivation/cultivation-logging.service.js';
import { accuracyMetricsService } from '../ai/accuracy-metrics.service.js';
import { aiReuseService } from '../ai/ai-reuse.service.js';
import { followUpCopy } from './recommendation-follow-up-copy.js';
import type { AdvisoryLanguage } from '../ai/types.js';

const APPLICATION_CHECK_DAYS = () =>
  Number(process.env.REC_FOLLOWUP_APPLICATION_DAYS ?? 1);
const OUTCOME_CHECK_DAYS = () => Number(process.env.REC_FOLLOWUP_OUTCOME_DAYS ?? 5);
const MAX_APPLICATION_REMINDERS = () =>
  Number(process.env.REC_FOLLOWUP_MAX_REMINDERS ?? 3);
const NO_RESPONSE_ESCALATION_DAYS = () =>
  Number(process.env.REC_FOLLOWUP_NO_RESPONSE_DAYS ?? 3);

type RecRow = {
  id: string;
  farmer_id: string;
  block_id: string | null;
  ai_session_id: string | null;
  issue_detected: string | null;
  recommendation_text: string;
  products: unknown;
  dosage: string | null;
  application_type: string | null;
  dap_at_recommendation: number | null;
  language: string;
  status: string;
  communicated_at: string | null;
  technical_name: string | null;
  trade_name: string | null;
  severity: string | null;
  metadata?: Record<string, unknown>;
  farmers?: { phone: string | null; preferred_language: string | null };
  farm_blocks?: { crop_type: string | null } | null;
};

export type ApplicationReply = 'yes_applied' | 'not_yet' | 'need_clarification';
export type OutcomeReply = 'improved' | 'no_improvement' | 'worsened' | 'partial';

function parseProducts(products: unknown): {
  technicalName?: string;
  tradeName?: string;
} {
  if (!Array.isArray(products) || !products.length) return {};
  const first = products[0];
  if (typeof first === 'string') return { tradeName: first, technicalName: first };
  if (first && typeof first === 'object') {
    const o = first as Record<string, unknown>;
    return {
      technicalName: String(o.technicalName ?? o.activeIngredient ?? o.productTitle ?? ''),
      tradeName: String(o.tradeName ?? o.productTitle ?? o.brand ?? ''),
    };
  }
  return {};
}

function addDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function addDaysDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const recommendationFollowUpService = {
  async loadRecord(recommendationRecordId: string): Promise<RecRow | null> {
    const { data, error } = await supabase
      .from('recommendation_records')
      .select(
        `id, farmer_id, block_id, ai_session_id, issue_detected, recommendation_text, products, dosage,
         application_type, dap_at_recommendation, language, status, communicated_at, technical_name, trade_name,
         severity, metadata, farmers(phone, preferred_language), farm_blocks(crop_type)`
      )
      .eq('id', recommendationRecordId)
      .maybeSingle();
    throwIfSupabaseError(error, 'Could not load recommendation');
    if (!data) return null;
    const raw = data as Record<string, unknown>;
    const farmersRel = raw.farmers;
    const blocksRel = raw.farm_blocks;
    return {
      ...raw,
      farmers: (Array.isArray(farmersRel) ? farmersRel[0] : farmersRel) as RecRow['farmers'],
      farm_blocks: (Array.isArray(blocksRel) ? blocksRel[0] : blocksRel) as RecRow['farm_blocks'],
    } as RecRow;
  },

  /** Stage 1 — recommendation communicated; schedule Day-1 application check. */
  async onRecommendationCommunicated(recommendationRecordId: string): Promise<void> {
    if (!env.ENABLE_ADVISORY_FOLLOW_UPS) return;

    const rec = await this.loadRecord(recommendationRecordId);
    if (!rec) return;

    const now = new Date().toISOString();
    await supabase
      .from('recommendation_records')
      .update({
        application_status: 'pending_application',
        updated_at: now,
        ...(rec.communicated_at ? {} : { communicated_at: now, status: 'communicated' }),
      })
      .eq('id', recommendationRecordId);

    await this.scheduleJob({
      farmerId: rec.farmer_id,
      recommendationRecordId,
      jobType: 'rec_application_check',
      scheduledAt: addDays(APPLICATION_CHECK_DAYS()),
      payload: { language: rec.language, phase: 'application_check' },
      sessionId: rec.ai_session_id,
    });

    await this.scheduleNoResponseEscalation(recommendationRecordId, rec.farmer_id);

    await this.upsertLearningSample(rec, { applicationConfirmed: false });
  },

  /** After AI diagnosis — mark latest session rec as communicated and start follow-up. */
  async bootstrapFromDiagnosisSession(sessionId: string, farmerId: string): Promise<void> {
    const { data: rec } = await supabase
      .from('recommendation_records')
      .select('id')
      .eq('ai_session_id', sessionId)
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!rec?.id) return;

    const now = new Date().toISOString();
    await supabase
      .from('recommendation_records')
      .update({
        status: 'communicated',
        communicated_at: now,
        application_status: 'pending_application',
        updated_at: now,
      })
      .eq('id', rec.id);

    await this.onRecommendationCommunicated(rec.id);
  },

  async scheduleJob(params: {
    farmerId: string;
    recommendationRecordId: string;
    jobType: string;
    scheduledAt: string;
    payload?: Record<string, unknown>;
    sessionId?: string | null;
  }): Promise<void> {
    await supabase.from('advisory_automation_jobs').insert({
      farmer_id: params.farmerId,
      session_id: params.sessionId ?? null,
      job_type: params.jobType,
      scheduled_at: params.scheduledAt,
      payload: {
        recommendationRecordId: params.recommendationRecordId,
        ...params.payload,
      },
    });
  },

  async sendApplicationCheck(recommendationRecordId: string): Promise<boolean> {
    const rec = await this.loadRecord(recommendationRecordId);
    if (!rec?.farmers?.phone) return false;

    const lang = (rec.language || rec.farmers.preferred_language || 'en') as AdvisoryLanguage;
    const copy = followUpCopy(lang);
    const body = copy.applicationCheck;

    try {
      await whatsappService.sendButtons({
        to: rec.farmers.phone,
        body,
        buttons: [
          { id: 'rec.apply_yes', title: 'Yes Applied' },
          { id: 'rec.apply_not', title: 'Not Yet' },
          { id: 'rec.apply_help', title: 'Need Help' },
        ],
      });
    } catch {
      await whatsappService.sendText(
        rec.farmers.phone,
        `${body}\n\nReply: Yes Applied / Not Yet / Need Clarification`
      );
    }

    const now = new Date().toISOString();
    await supabase.from('recommendation_follow_ups').insert({
      recommendation_record_id: recommendationRecordId,
      farmer_id: rec.farmer_id,
      block_id: rec.block_id,
      phase: 'application_check',
      status: 'sent',
      scheduled_at: now,
      sent_at: now,
    });

    await conversationPatchPending(rec.farmer_id, recommendationRecordId, 'application');
    return true;
  },

  async sendApplicationReminder(recommendationRecordId: string, reminderCount: number): Promise<void> {
    const rec = await this.loadRecord(recommendationRecordId);
    if (!rec?.farmers?.phone) return;

    const lang = (rec.language || rec.farmers.preferred_language || 'en') as AdvisoryLanguage;
    await whatsappService.sendText(rec.farmers.phone, followUpCopy(lang).notYetReminder);

    const now = new Date().toISOString();
    await supabase.from('recommendation_follow_ups').insert({
      recommendation_record_id: recommendationRecordId,
      farmer_id: rec.farmer_id,
      block_id: rec.block_id,
      phase: 'application_reminder',
      status: 'sent',
      scheduled_at: now,
      sent_at: now,
      reminder_count: reminderCount,
    });
  },

  async sendOutcomeCheck(recommendationRecordId: string): Promise<boolean> {
    const rec = await this.loadRecord(recommendationRecordId);
    if (!rec?.farmers?.phone) return false;

    const lang = (rec.language || rec.farmers.preferred_language || 'en') as AdvisoryLanguage;
    const body = followUpCopy(lang).outcomeCheck;

    try {
      await whatsappService.sendButtons({
        to: rec.farmers.phone,
        body,
        buttons: [
          { id: 'rec.outcome_yes', title: 'Improved' },
          { id: 'rec.outcome_no', title: 'No Change' },
          { id: 'rec.outcome_worse', title: 'Worsened' },
        ],
      });
    } catch {
      await whatsappService.sendText(
        rec.farmers.phone,
        `${body}\n\nReply: Improved / No Improvement / Worsened`
      );
    }

    const now = new Date().toISOString();
    await supabase.from('recommendation_follow_ups').insert({
      recommendation_record_id: recommendationRecordId,
      farmer_id: rec.farmer_id,
      block_id: rec.block_id,
      phase: 'outcome_check',
      status: 'sent',
      scheduled_at: now,
      sent_at: now,
    });

    await conversationPatchPending(rec.farmer_id, recommendationRecordId, 'outcome');
    return true;
  },

  async handleApplicationReply(
    farmerId: string,
    recommendationRecordId: string,
    reply: ApplicationReply
  ): Promise<string> {
    const rec = await this.loadRecord(recommendationRecordId);
    if (!rec || rec.farmer_id !== farmerId) {
      return 'Could not find your recommendation. Type menu for help.';
    }

    const lang = (rec.language || 'en') as AdvisoryLanguage;
    const copy = followUpCopy(lang);
    const now = new Date().toISOString();

    await supabase
      .from('recommendation_follow_ups')
      .update({
        status: 'responded',
        farmer_response: reply,
        responded_at: now,
        updated_at: now,
      })
      .eq('recommendation_record_id', recommendationRecordId)
      .eq('phase', 'application_check')
      .in('status', ['sent', 'scheduled']);

    if (reply === 'yes_applied') {
      const productMeta = parseProducts(rec.products);
      const technicalName = rec.technical_name || productMeta.technicalName || null;
      const tradeName = rec.trade_name || productMeta.tradeName || null;
      const appliedDate = new Date().toISOString().slice(0, 10);
      const followUpDate = addDaysDate(OUTCOME_CHECK_DAYS());

      const activity = await cultivationLoggingService.logActivity({
        farmerId,
        activityType: mapApplicationMethod(rec.application_type),
        advisorySessionId: rec.ai_session_id ?? undefined,
        dosageNotes: rec.dosage ?? undefined,
        notes: 'Farmer confirmed recommendation applied (auto follow-up)',
        source: 'recommendation_follow_up',
      });

      await supabase.from('recommendation_applications').upsert(
        {
          recommendation_record_id: recommendationRecordId,
          farmer_id: farmerId,
          block_id: rec.block_id,
          technical_name: technicalName,
          trade_name: tradeName,
          dosage: rec.dosage,
          application_method: rec.application_type,
          applied_at: appliedDate,
          follow_up_date: followUpDate,
          result_status: 'pending',
          applied_by: 'farmer',
          cultivation_activity_id: activity.id,
          updated_at: now,
        },
        { onConflict: 'recommendation_record_id' }
      );

      await supabase
        .from('recommendation_records')
        .update({
          status: 'applied',
          application_status: 'applied',
          applied_at: now,
          updated_at: now,
        })
        .eq('id', recommendationRecordId);

      await this.scheduleJob({
        farmerId,
        recommendationRecordId,
        jobType: 'rec_outcome_check',
        scheduledAt: new Date(
          Date.now() + OUTCOME_CHECK_DAYS() * 24 * 60 * 60 * 1000
        ).toISOString(),
        payload: { language: rec.language, phase: 'outcome_check' },
        sessionId: rec.ai_session_id,
      });

      await this.upsertLearningSample(rec, { applicationConfirmed: true });
      await clearConversationPending(farmerId);
      return copy.appliedThanks;
    }

    if (reply === 'not_yet') {
      await supabase
        .from('recommendation_records')
        .update({ application_status: 'pending_application', updated_at: now })
        .eq('id', recommendationRecordId);

      const { count } = await supabase
        .from('recommendation_follow_ups')
        .select('id', { count: 'exact', head: true })
        .eq('recommendation_record_id', recommendationRecordId)
        .eq('phase', 'application_reminder');

      const reminderCount = (count ?? 0) + 1;
      if (reminderCount <= MAX_APPLICATION_REMINDERS()) {
        await this.scheduleJob({
          farmerId,
          recommendationRecordId,
          jobType: 'rec_application_reminder',
          scheduledAt: addDays(1),
          payload: { language: rec.language, reminderCount },
          sessionId: rec.ai_session_id,
        });
      } else {
        await this.escalateNoApplicationConfirmation(farmerId, recommendationRecordId, rec);
      }

      await clearConversationPending(farmerId);
      return copy.notYetReminder;
    }

    // need_clarification
    await supabase
      .from('recommendation_records')
      .update({ application_status: 'need_clarification', updated_at: now })
      .eq('id', recommendationRecordId);

    await createTelecallerTask({
      farmerId,
      title: 'Telecaller Callback Required',
      notes: `Farmer needs clarification on recommendation ${recommendationRecordId.slice(0, 8)}`,
      priority: 'high',
    });

    await clearConversationPending(farmerId);
    return copy.clarificationAck;
  },

  async handleOutcomeReply(
    farmerId: string,
    recommendationRecordId: string,
    reply: OutcomeReply
  ): Promise<string> {
    const rec = await this.loadRecord(recommendationRecordId);
    if (!rec || rec.farmer_id !== farmerId) {
      return 'Could not find your recommendation. Type menu for help.';
    }

    const lang = (rec.language || 'en') as AdvisoryLanguage;
    const copy = followUpCopy(lang);
    const now = new Date().toISOString();

    const outcomeMap: Record<OutcomeReply, 'better' | 'partial' | 'no_improvement'> = {
      improved: 'better',
      partial: 'partial',
      no_improvement: 'no_improvement',
      worsened: 'no_improvement',
    };

    const resultStatusMap: Record<OutcomeReply, string> = {
      improved: 'improved',
      partial: 'partial',
      no_improvement: 'no_improvement',
      worsened: 'worsened',
    };

    await supabase
      .from('recommendation_follow_ups')
      .update({
        status: 'completed',
        farmer_response: reply,
        responded_at: now,
        updated_at: now,
      })
      .eq('recommendation_record_id', recommendationRecordId)
      .eq('phase', 'outcome_check');

    await supabase
      .from('recommendation_applications')
      .update({
        result_status: resultStatusMap[reply],
        updated_at: now,
      })
      .eq('recommendation_record_id', recommendationRecordId);

    await recommendationRecordsService.recordOutcome(
      recommendationRecordId,
      outcomeMap[reply === 'worsened' ? 'no_improvement' : reply],
      `WhatsApp follow-up: ${reply}`
    );

    await accuracyMetricsService.logFollowupOutcome({
      farmerId,
      sessionId: rec.ai_session_id ?? undefined,
      outcome:
        reply === 'improved'
          ? 'improved'
          : reply === 'worsened'
            ? 'worsened'
            : reply === 'partial'
              ? 'partial'
              : 'no_improvement',
      notes: `Recommendation ${recommendationRecordId}: ${reply}`,
    });

    await this.upsertLearningSample(rec, {
      applicationConfirmed: true,
      outcome: reply,
      escalated: reply === 'worsened' || reply === 'no_improvement',
    });

    if (reply === 'improved' || reply === 'partial') {
      await aiReuseService.markOutcomeForSession(rec.ai_session_id, true).catch(() => {});
      await clearConversationPending(farmerId);
      return copy.improvedThanks;
    }

    if (reply === 'worsened') {
      await this.escalateWorsened(farmerId, rec);
      await clearConversationPending(farmerId);
      return copy.worsenedReply;
    }

    await this.escalateNoImprovement(farmerId, recommendationRecordId, rec);
    await clearConversationPending(farmerId);
    return copy.noImprovementReply;
  },

  async resolvePendingRecommendationId(farmerId: string): Promise<string | null> {
    const { data: session } = await supabase
      .from('conversation_sessions')
      .select('context')
      .eq('farmer_id', farmerId)
      .eq('channel', 'whatsapp')
      .maybeSingle();

    const ctx = (session?.context ?? {}) as Record<string, unknown>;
    if (typeof ctx.pendingRecommendationRecordId === 'string') {
      return ctx.pendingRecommendationRecordId;
    }

    const { data: rec } = await supabase
      .from('recommendation_records')
      .select('id')
      .eq('farmer_id', farmerId)
      .in('status', ['communicated', 'applied'])
      .in('application_status', ['pending_application', 'applied'])
      .order('communicated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return rec?.id ?? null;
  },

  async processAutomationJob(job: {
    farmer_id: string;
    job_type: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const recId = String(job.payload.recommendationRecordId ?? '');
    if (!recId) {
      logger.warn({ jobType: job.job_type }, 'Recommendation follow-up job missing rec id');
      return;
    }

    switch (job.job_type) {
      case 'rec_application_check':
        await this.sendApplicationCheck(recId);
        break;
      case 'rec_application_reminder': {
        const reminderCount = Number(job.payload.reminderCount ?? 1);
        await this.sendApplicationReminder(recId, reminderCount);
        break;
      }
      case 'rec_outcome_check':
        await this.sendOutcomeCheck(recId);
        break;
      case 'rec_no_response_escalation':
        await this.escalateNoApplicationConfirmation(job.farmer_id, recId, null);
        break;
      default:
        break;
    }
  },

  async escalateNoApplicationConfirmation(
    farmerId: string,
    recommendationRecordId: string,
    rec: RecRow | null
  ): Promise<void> {
    const row = rec ?? (await this.loadRecord(recommendationRecordId));
    await createTelecallerTask({
      farmerId,
      title: 'Recommendation Follow-Up Required',
      notes: `No application confirmation after reminders. Rec ${recommendationRecordId.slice(0, 8)}${row?.issue_detected ? ` | ${row.issue_detected}` : ''}`,
      priority: 'high',
    });
  },

  async escalateNoImprovement(
    farmerId: string,
    recommendationRecordId: string,
    rec: RecRow
  ): Promise<void> {
    await createTelecallerTask({
      farmerId,
      title: 'Reassessment Required',
      notes: `No improvement after recommendation ${recommendationRecordId.slice(0, 8)}. Issue: ${rec.issue_detected ?? 'n/a'}`,
      priority: 'high',
    });

    if (rec.ai_session_id) {
      await supabase.from('agronomist_escalations').insert({
        session_id: rec.ai_session_id,
        farmer_id: farmerId,
        reason: 'No improvement after recommendation (Day-5 follow-up)',
        confidence_at_escalation: 0.5,
        priority: 'high',
        status: 'pending',
      });
    }
  },

  async escalateWorsened(farmerId: string, rec: RecRow): Promise<void> {
    await createTelecallerTask({
      farmerId,
      title: 'Urgent — crop condition worsened',
      notes: `Recommendation ${rec.id.slice(0, 8)} | ${rec.issue_detected ?? ''}`,
      priority: 'urgent',
    });

    if (rec.ai_session_id) {
      await supabase.from('agronomist_escalations').insert({
        session_id: rec.ai_session_id,
        farmer_id: farmerId,
        reason: 'Worsened after recommendation (Day-5 follow-up)',
        confidence_at_escalation: 0.4,
        priority: 'urgent',
        status: 'pending',
      });
    }
  },

  async scheduleNoResponseEscalation(recommendationRecordId: string, farmerId: string): Promise<void> {
    await this.scheduleJob({
      farmerId,
      recommendationRecordId,
      jobType: 'rec_no_response_escalation',
      scheduledAt: addDays(NO_RESPONSE_ESCALATION_DAYS()),
      payload: {},
    });
  },

  async getTelecallerFollowUpDetail(recommendationRecordId: string) {
    const rec = await this.loadRecord(recommendationRecordId);
    if (!rec) return null;

    const [{ data: application }, { data: followUps }, { data: sessions }] = await Promise.all([
      supabase
        .from('recommendation_applications')
        .select('*')
        .eq('recommendation_record_id', recommendationRecordId)
        .maybeSingle(),
      supabase
        .from('recommendation_follow_ups')
        .select('*')
        .eq('recommendation_record_id', recommendationRecordId)
        .order('created_at', { ascending: false }),
      rec.ai_session_id
        ? supabase
            .from('ai_advisory_sessions')
            .select('id, confidence_score, status, created_at')
            .eq('id', rec.ai_session_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      recommendation: rec,
      application: application ?? null,
      followUps: followUps ?? [],
      session: sessions ?? null,
      escalationStatus: followUps?.some((f) => f.status === 'escalated') ?? false,
    };
  },

  async getKpis(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: recs } = await supabase
      .from('recommendation_records')
      .select('id, status, application_status, outcome, communicated_at, applied_at')
      .gte('created_at', since);

    const rows = recs ?? [];
    const communicated = rows.filter((r) =>
      ['communicated', 'applied', 'outcome_recorded'].includes(String(r.status))
    );
    const applied = rows.filter(
      (r) => r.application_status === 'applied' || r.status === 'applied' || r.status === 'outcome_recorded'
    );
    const outcomes = rows.filter((r) => r.status === 'outcome_recorded');
    const success = outcomes.filter((r) => r.outcome === 'better');

    const { count: pendingFollowUps } = await supabase
      .from('recommendation_follow_ups')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .gte('scheduled_at', since);

    return {
      periodDays: days,
      recommendationsCommunicated: communicated.length,
      applicationRatePct:
        communicated.length > 0
          ? Math.round((applied.length / communicated.length) * 100)
          : 0,
      outcomeRecorded: outcomes.length,
      successRatePct:
        outcomes.length > 0 ? Math.round((success.length / outcomes.length) * 100) : 0,
      pendingScheduledFollowUps: pendingFollowUps ?? 0,
      noResponseFarmers: rows.filter((r) => r.application_status === 'pending_application').length,
    };
  },

  async upsertLearningSample(
    rec: RecRow,
    patch: {
      applicationConfirmed?: boolean;
      outcome?: string;
      escalated?: boolean;
    }
  ): Promise<void> {
    const productMeta = parseProducts(rec.products);
    const snapshot = {
      issue: rec.issue_detected,
      text: rec.recommendation_text.slice(0, 2000),
      dosage: rec.dosage,
      applicationType: rec.application_type,
      technicalName: rec.technical_name || productMeta.technicalName,
      tradeName: rec.trade_name || productMeta.tradeName,
      products: rec.products,
    };

    const { data: existing } = await supabase
      .from('ai_learning_samples')
      .select('id')
      .eq('recommendation_record_id', rec.id)
      .maybeSingle();

    const row = {
      farmer_id: rec.farmer_id,
      ai_session_id: rec.ai_session_id,
      crop_type: rec.farm_blocks?.crop_type ?? null,
      disease_label: rec.issue_detected,
      dap: rec.dap_at_recommendation,
      severity: rec.severity,
      recommendation_snapshot: snapshot,
      application_confirmed: patch.applicationConfirmed ?? null,
      outcome: patch.outcome ?? null,
      escalated: patch.escalated ?? false,
    };

    if (existing?.id) {
      await supabase.from('ai_learning_samples').update(row).eq('id', existing.id);
    } else {
      await supabase.from('ai_learning_samples').insert({
        recommendation_record_id: rec.id,
        ...row,
      });
    }
  },

  async buildBlockTimelineEvents(blockId: string, farmerId: string) {
    const events: Array<{ title: string; at: string; kind: string; detail?: string }> = [];

    const { data: recs } = await supabase
      .from('recommendation_records')
      .select(
        'id, created_at, communicated_at, applied_at, issue_detected, status, application_status, outcome'
      )
      .eq('block_id', blockId)
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false })
      .limit(10);

    for (const r of recs ?? []) {
      events.push({
        kind: 'diagnosis',
        title: 'Diagnosis / recommendation created',
        at: String(r.created_at),
        detail: r.issue_detected ?? undefined,
      });
      if (r.communicated_at) {
        events.push({
          kind: 'recommendation_sent',
          title: 'Recommendation sent',
          at: String(r.communicated_at),
        });
      }
      if (r.applied_at || r.application_status === 'applied') {
        events.push({
          kind: 'recommendation_applied',
          title: 'Recommendation applied',
          at: String(r.applied_at ?? r.communicated_at),
        });
      }
      if (r.status === 'outcome_recorded') {
        events.push({
          kind: 'follow_up_completed',
          title: 'Follow-up completed',
          at: String(r.applied_at ?? r.created_at),
          detail: r.outcome ? `Result: ${r.outcome}` : undefined,
        });
      }
    }

    const { data: apps } = await supabase
      .from('recommendation_applications')
      .select('applied_at, trade_name, technical_name, result_status')
      .eq('block_id', blockId)
      .eq('farmer_id', farmerId)
      .order('applied_at', { ascending: false })
      .limit(5);

    for (const a of apps ?? []) {
      events.push({
        kind: 'application_entry',
        title: `Application recorded — ${a.trade_name || a.technical_name || 'Treatment'}`,
        at: `${a.applied_at}T12:00:00.000Z`,
        detail: a.result_status ? `Result: ${a.result_status}` : undefined,
      });
    }

    return events;
  },
};

function mapApplicationMethod(
  applicationType: string | null
): 'spray_applied' | 'fertigation' | 'drench' | 'other' {
  const t = (applicationType ?? '').toLowerCase();
  if (/drench|root/i.test(t)) return 'drench';
  if (/fertig/i.test(t)) return 'fertigation';
  if (/spray|foliar/i.test(t)) return 'spray_applied';
  return 'spray_applied';
}

async function conversationPatchPending(
  farmerId: string,
  recommendationRecordId: string,
  phase: 'application' | 'outcome'
): Promise<void> {
  const { data } = await supabase
    .from('conversation_sessions')
    .select('context')
    .eq('farmer_id', farmerId)
    .eq('channel', 'whatsapp')
    .maybeSingle();

  const ctx = (data?.context ?? {}) as Record<string, unknown>;
  await supabase
    .from('conversation_sessions')
    .update({
      context: {
        ...ctx,
        pendingRecommendationRecordId: recommendationRecordId,
        pendingRecommendationFollowUp: phase,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('farmer_id', farmerId)
    .eq('channel', 'whatsapp');
}

async function clearConversationPending(farmerId: string): Promise<void> {
  const { data } = await supabase
    .from('conversation_sessions')
    .select('context')
    .eq('farmer_id', farmerId)
    .eq('channel', 'whatsapp')
    .maybeSingle();

  const ctx = { ...((data?.context ?? {}) as Record<string, unknown>) };
  delete ctx.pendingRecommendationRecordId;
  delete ctx.pendingRecommendationFollowUp;

  await supabase
    .from('conversation_sessions')
    .update({ context: ctx, updated_at: new Date().toISOString() })
    .eq('farmer_id', farmerId)
    .eq('channel', 'whatsapp');
}
