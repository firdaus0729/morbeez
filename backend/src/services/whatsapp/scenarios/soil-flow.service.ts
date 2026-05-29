import { supabase } from '../../../lib/supabase.js';
import { crmFarmerService } from '../../admin/crm-farmer.service.js';
import {
  applyMacroValues,
  applyMicroValues,
  emptySoilLabMetrics,
  formatSoilSummary,
  hasAnyMetricValue,
  macroPrompt,
  microPrompt,
  normalizeSoilMetrics,
  parseCommaValues,
  type SoilLabMetrics,
} from '../../soil/soil-lab-metrics.js';
import { createTelecallerTask } from '../pipeline/telecaller-tasks.service.js';
import { t } from './whatsapp-flow-copy.js';
import type { AdvisoryLanguage } from '../../ai/types.js';

type SoilMenuList = {
  body: string;
  buttonText: string;
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
};

/** Scenarios 12–14, 43 — soil testing flows. */
export const soilFlowService = {
  soilMenuList(language: AdvisoryLanguage): SoilMenuList {
    return {
      body: t('soilMenu', language),
      buttonText: language === 'ml' ? 'തിരഞ്ഞെടുക്കുക' : 'Choose',
      sections: [
        {
          title: 'Soil',
          rows: [
            { id: 'soil.upload', title: 'Upload Report', description: 'PDF or photo' },
            { id: 'soil.enter_lab', title: 'Enter lab values', description: 'pH, N, P, K…' },
            { id: 'soil.testing', title: 'Soil Testing', description: 'Request collection' },
            { id: 'soil.address', title: 'Send Address', description: 'Sample drop point' },
            { id: 'soil.expert', title: 'Expert Help', description: 'Talk to agronomist' },
          ],
        },
      ],
    };
  },

  async hasSoilReport(farmerId: string): Promise<boolean> {
    const { data: farmer } = await supabase
      .from('farmers')
      .select('metadata')
      .eq('id', farmerId)
      .maybeSingle();
    const meta = (farmer?.metadata ?? {}) as Record<string, unknown>;
    if (meta.soil_report_uploaded || meta.soil_report_at) return true;

    const { count: findingsCount } = await supabase
      .from('crm_field_findings')
      .select('id', { count: 'exact', head: true })
      .eq('farmer_id', farmerId)
      .or('observations.ilike.%soil%,disease_pest.ilike.%soil%');
    if ((findingsCount ?? 0) > 0) return true;

    const { count: reportCount } = await supabase
      .from('crm_soil_reports')
      .select('id', { count: 'exact', head: true })
      .eq('farmer_id', farmerId);
    return (reportCount ?? 0) > 0;
  },

  async handleLowYieldWithoutReport(
    _farmerId: string,
    language: AdvisoryLanguage
  ): Promise<{ body: string; list: SoilMenuList }> {
    return {
      body: t('noSoilReport', language),
      list: this.soilMenuList(language),
    };
  },

  addressReply(language: AdvisoryLanguage): string {
    return t('soilAddress', language);
  },

  async requestSoilTesting(farmerId: string, language: AdvisoryLanguage): Promise<string> {
    await createTelecallerTask({
      farmerId,
      title: 'Soil testing request (WhatsApp)',
      notes: `Language: ${language}`,
      priority: 'normal',
    });
    await supabase.from('callback_requests').insert({
      farmer_id: farmerId,
      preferred_time: 'any',
      status: 'pending',
      telecaller_notes: 'Soil testing — WhatsApp menu',
    });
    return 'Soil testing request received.\n\nOur team will contact you for sample collection.';
  },

  reportReceivedReply(language: AdvisoryLanguage): string {
    return t('soilReportReceived', language);
  },

  macroEntryPrompt(lang: AdvisoryLanguage): string {
    return macroPrompt(lang);
  },

  microEntryPrompt(lang: AdvisoryLanguage): string {
    return microPrompt(lang);
  },

  async saveLabMetrics(
    farmerId: string,
    metrics: SoilLabMetrics,
    options?: { blockId?: string; uploadedBy?: string }
  ): Promise<string> {
    await crmFarmerService.createSoilReport(farmerId, {
      blockId: options?.blockId,
      metrics: metrics as unknown as Record<string, unknown>,
      uploadedBy: options?.uploadedBy ?? 'whatsapp',
    });
    const now = new Date().toISOString();
    const { data: farmer } = await supabase.from('farmers').select('metadata').eq('id', farmerId).maybeSingle();
    const meta = (farmer?.metadata ?? {}) as Record<string, unknown>;
    await supabase
      .from('farmers')
      .update({
        metadata: { ...meta, soil_report_uploaded: true, soil_report_at: now },
        updated_at: now,
      })
      .eq('id', farmerId);
    return formatSoilSummary(metrics);
  },

  parseMacroInput(text: string): SoilLabMetrics | null {
    const values = parseCommaValues(text, 9);
    if (!values) return null;
    return applyMacroValues(emptySoilLabMetrics(), values);
  },

  parseMicroInput(draft: SoilLabMetrics, text: string): SoilLabMetrics | null {
    const values = parseCommaValues(text, 5);
    if (!values) return null;
    return applyMicroValues(draft, values);
  },

  savedLabReply(lang: AdvisoryLanguage, summary: string): string {
    if (lang === 'ml') return `മണ്ണ് പരിശോധന സേവ് ചെയ്തു.\n\n${summary}`;
    return `Soil test saved.\n\n${summary}`;
  },

  invalidValuesReply(lang: AdvisoryLanguage, step: 'macro' | 'micro'): string {
    if (lang === 'ml') {
      return step === 'macro'
        ? 'സംഖ്യകൾ കോമയിൽ വേർതിരിച്ച് 9 മൂല്യങ്ങൾ അയയ്ക്കുക.'
        : 'സംഖ്യകൾ കോമയിൽ വേർതിരിച്ച് 5 മൂല്യങ്ങൾ അയയ്ക്കുക (Zn, B, Fe, Mn, Cu).';
    }
    return step === 'macro'
      ? 'Please send 9 numbers separated by commas (see example above).'
      : 'Please send 5 numbers separated by commas: Zn, B, Fe, Mn, Cu.';
  },

  draftFromContext(ctx: Record<string, unknown>): SoilLabMetrics {
    return normalizeSoilMetrics(ctx.soilLabDraft ?? {});
  },

  draftToContext(metrics: SoilLabMetrics): Record<string, unknown> {
    return metrics as unknown as Record<string, unknown>;
  },

  metricsHasValues(metrics: SoilLabMetrics): boolean {
    return hasAnyMetricValue(metrics);
  },
};
