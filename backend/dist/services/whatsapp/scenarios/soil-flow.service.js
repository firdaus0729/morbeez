import { supabase } from '../../../lib/supabase.js';
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
        const { count } = await supabase
            .from('crm_field_findings')
            .select('id', { count: 'exact', head: true })
            .eq('farmer_id', farmerId)
            .or('observations.ilike.%soil%,disease_pest.ilike.%soil%');
        return (count ?? 0) > 0;
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
};
//# sourceMappingURL=soil-flow.service.js.map