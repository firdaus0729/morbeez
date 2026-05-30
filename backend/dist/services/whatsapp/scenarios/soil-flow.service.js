import { supabase } from '../../../lib/supabase.js';
import { crmFarmerService } from '../../admin/crm-farmer.service.js';
import { applyMacroValues, applyMicroValues, emptySoilLabMetrics, formatSoilSummary, hasAnyMetricValue, macroPrompt, microPrompt, normalizeSoilMetrics, parseCommaValues, parseSoilType, soilTypePrompt, } from '../../soil/soil-lab-metrics.js';
import { createTelecallerTask } from '../pipeline/telecaller-tasks.service.js';
import { t } from './whatsapp-flow-copy.js';
/** Scenarios 12–14, 43 — soil testing flows. */
export const soilFlowService = {
    soilMenuList(language) {
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
    async hasSoilReport(farmerId) {
        const { data: farmer } = await supabase
            .from('farmers')
            .select('metadata')
            .eq('id', farmerId)
            .maybeSingle();
        const meta = (farmer?.metadata ?? {});
        if (meta.soil_report_uploaded || meta.soil_report_at)
            return true;
        const { count: findingsCount } = await supabase
            .from('crm_field_findings')
            .select('id', { count: 'exact', head: true })
            .eq('farmer_id', farmerId)
            .or('observations.ilike.%soil%,disease_pest.ilike.%soil%');
        if ((findingsCount ?? 0) > 0)
            return true;
        const { count: reportCount } = await supabase
            .from('crm_soil_reports')
            .select('id', { count: 'exact', head: true })
            .eq('farmer_id', farmerId);
        return (reportCount ?? 0) > 0;
    },
    async handleLowYieldWithoutReport(_farmerId, language) {
        return {
            body: t('noSoilReport', language),
            list: this.soilMenuList(language),
        };
    },
    addressReply(language) {
        return t('soilAddress', language);
    },
    async requestSoilTesting(farmerId, language) {
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
    reportReceivedReply(language) {
        return t('soilReportReceived', language);
    },
    macroEntryPrompt(lang) {
        return macroPrompt(lang);
    },
    microEntryPrompt(lang) {
        return microPrompt(lang);
    },
    soilTypeEntryPrompt(lang) {
        return soilTypePrompt(lang);
    },
    parseSoilTypeInput(text) {
        return parseSoilType(text);
    },
    async saveLabMetrics(farmerId, metrics, options) {
        await crmFarmerService.createSoilReport(farmerId, {
            blockId: options?.blockId,
            metrics: metrics,
            uploadedBy: options?.uploadedBy ?? 'whatsapp',
        });
        const now = new Date().toISOString();
        const { data: farmer } = await supabase.from('farmers').select('metadata').eq('id', farmerId).maybeSingle();
        const meta = (farmer?.metadata ?? {});
        await supabase
            .from('farmers')
            .update({
            metadata: { ...meta, soil_report_uploaded: true, soil_report_at: now },
            updated_at: now,
        })
            .eq('id', farmerId);
        return formatSoilSummary(metrics);
    },
    parseMacroInput(text) {
        const values = parseCommaValues(text, 9);
        if (!values)
            return null;
        return applyMacroValues(emptySoilLabMetrics(), values);
    },
    parseMicroInput(draft, text) {
        const values = parseCommaValues(text, 5);
        if (!values)
            return null;
        return applyMicroValues(draft, values);
    },
    savedLabReply(lang, summary) {
        if (lang === 'ml')
            return `മണ്ണ് പരിശോധന സേവ് ചെയ്തു.\n\n${summary}`;
        return `Soil test saved.\n\n${summary}`;
    },
    invalidValuesReply(lang, step) {
        if (lang === 'ml') {
            return step === 'macro'
                ? 'സംഖ്യകൾ കോമയിൽ വേർതിരിച്ച് 9 മൂല്യങ്ങൾ അയയ്ക്കുക.'
                : 'സംഖ്യകൾ കോമയിൽ വേർതിരിച്ച് 5 മൂല്യങ്ങൾ അയയ്ക്കുക (Zn, B, Fe, Mn, Cu).';
        }
        return step === 'macro'
            ? 'Please send 9 numbers separated by commas (see example above).'
            : 'Please send 5 numbers separated by commas: Zn, B, Fe, Mn, Cu.';
    },
    draftFromContext(ctx) {
        return normalizeSoilMetrics(ctx.soilLabDraft ?? {});
    },
    draftToContext(metrics) {
        return metrics;
    },
    metricsHasValues(metrics) {
        return hasAnyMetricValue(metrics);
    },
};
//# sourceMappingURL=soil-flow.service.js.map