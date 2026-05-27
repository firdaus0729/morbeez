import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { supabase } from '../../lib/supabase.js';
import { whatsappService } from '../whatsapp/whatsapp.service.js';
import { farmerService } from '../farmer/farmer.service.js';
import { cultivationLoggingService } from '../whatsapp/cultivation/cultivation-logging.service.js';
import type { AdvisoryLanguage } from '../ai/types.js';

const POLL_MS = 60_000;

async function processJob(job: {
  id: string;
  farmer_id: string;
  job_type: string;
  payload: Record<string, unknown>;
  attempts: number;
}): Promise<void> {
  const { data: farmer } = await supabase
    .from('farmers')
    .select('phone, preferred_language')
    .eq('id', job.farmer_id)
    .single();

  if (!farmer?.phone) throw new Error('Farmer phone missing');

  const lang = (job.payload.language as string) ?? farmer.preferred_language ?? 'en';

  if (job.job_type === 'whatsapp_follow_up') {
    const msg =
      lang === 'ml'
        ? 'നമസ്കാരം! നിങ്ങളുടെ വിള നില പരിശോധിക്കാൻ Morbeez ടീം സഹായിക്കാം. ചിത്രം അയയ്ക്കാം.'
        : 'Hi! Morbeez follow-up on your crop advisory. Reply with a photo or symptoms if you need more help.';
    await whatsappService.sendText(farmer.phone, msg);
  } else if (job.job_type === 'callback_reminder') {
    await farmerService.logInteraction(
      job.farmer_id,
      'system',
      'outbound',
      'Callback reminder queued for telecaller',
      { sessionId: job.payload.sessionId }
    );
    logger.info({ farmerId: job.farmer_id }, 'Callback reminder — telecaller queue');
  } else if (job.job_type === 'cultivation_application_prompt') {
    await cultivationLoggingService.sendApplicationPrompt(
      farmer.phone,
      job.farmer_id,
      (lang as AdvisoryLanguage) ?? 'en'
    );
  } else if (job.job_type === 'cultivation_result_validation') {
    const activityId = String(job.payload.activityId ?? '');
    if (activityId) {
      await cultivationLoggingService.sendResultValidationPrompt(
        farmer.phone,
        job.farmer_id,
        (lang as AdvisoryLanguage) ?? 'en',
        activityId
      );
    }
  }

  await supabase
    .from('advisory_automation_jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', job.id);
}

async function poll(): Promise<void> {
  const now = new Date().toISOString();
  const { data: jobs } = await supabase
    .from('advisory_automation_jobs')
    .select('id, farmer_id, job_type, payload, attempts')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .limit(10);

  for (const job of jobs ?? []) {
    await supabase
      .from('advisory_automation_jobs')
      .update({ status: 'processing', attempts: job.attempts + 1 })
      .eq('id', job.id);

    try {
      await processJob(job);
    } catch (err) {
      logger.error({ err, jobId: job.id }, 'Automation job failed');
      await supabase
        .from('advisory_automation_jobs')
        .update({
          status: job.attempts >= 3 ? 'failed' : 'pending',
          last_error: String(err),
        })
        .eq('id', job.id);
    }
  }
}

let interval: ReturnType<typeof setInterval> | null = null;

export function startAdvisoryAutomationWorker(): void {
  if (env.NODE_ENV === 'test' || !env.ENABLE_ADVISORY_AUTOMATION) return;
  if (interval) return;

  interval = setInterval(() => {
    poll().catch((err) => logger.error({ err }, 'Automation poll error'));
  }, POLL_MS);

  logger.info('Advisory automation worker started');
}
