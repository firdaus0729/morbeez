import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError } from '../../lib/errors.js';
import { blockService } from '../core/block.service.js';
import { fieldStorageService } from '../core/field-storage.service.js';
import { telecallerAdminService } from './telecaller-admin.service.js';
export const fieldPwaService = {
    async searchFarmers(q, limit = 20) {
        const term = q.trim();
        if (term.length < 2)
            return [];
        const digits = term.replace(/\D/g, '');
        let query = supabase
            .from('farmers')
            .select('id, phone, name, first_name, last_name, district, village, preferred_language')
            .order('updated_at', { ascending: false })
            .limit(limit);
        if (digits.length >= 4) {
            query = query.ilike('phone', `%${digits.slice(-10)}%`);
        }
        else {
            query = query.or(`name.ilike.%${term}%,first_name.ilike.%${term}%,district.ilike.%${term}%`);
        }
        const { data, error } = await query;
        throwIfSupabaseError(error, 'Could not search farmers');
        return (data ?? []).map((f) => ({
            id: f.id,
            phone: f.phone,
            name: [f.first_name, f.last_name].filter(Boolean).join(' ') ||
                String(f.name ?? '').trim() ||
                'Farmer',
            district: f.district,
            village: f.village,
            preferredLanguage: f.preferred_language ?? 'en',
        }));
    },
    async getFarmerBlocks(farmerId) {
        const blocks = await blockService.listByFarmer(farmerId);
        return blocks.map((b) => ({
            id: b.id,
            name: b.name,
            cropType: b.crop_type,
            plotLabel: b.plot_label,
            dap: b.dap,
            plantingDate: b.planting_date,
        }));
    },
    async getQuestionnaire(cropType) {
        const crop = cropType.trim().toLowerCase() || 'ginger';
        const { data, error } = await supabase
            .from('field_visit_questionnaire')
            .select('*')
            .eq('active', true)
            .in('crop_type', [crop, '_default'])
            .order('sort_order');
        throwIfSupabaseError(error, 'Could not load questionnaire');
        const rows = data ?? [];
        const specific = rows.filter((r) => r.crop_type === crop);
        const use = specific.length ? specific : rows.filter((r) => r.crop_type === '_default');
        return use.map((r) => ({
            id: r.id,
            questionKey: r.question_key,
            labelEn: r.label_en,
            labelMl: r.label_ml,
            inputType: r.input_type,
            options: r.options ?? [],
            required: r.required,
            sortOrder: r.sort_order,
        }));
    },
    async submitVisit(input) {
        const farmer = await supabase
            .from('farmers')
            .select('id, phone')
            .eq('id', input.farmerId)
            .maybeSingle();
        if (!farmer.data)
            throw new NotFoundError('Farmer not found');
        let leadId = input.leadId;
        if (!leadId) {
            const { data: lead } = await supabase
                .from('leads')
                .select('id')
                .eq('farmer_id', input.farmerId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            leadId = lead?.id ?? undefined;
        }
        const photoUrls = input.photos?.length
            ? await fieldStorageService.uploadPhotos(input.farmerId, input.photos)
            : [];
        const parameters = input.answers.map((a) => ({
            key: a.questionKey,
            label: a.label,
            value: a.value,
        }));
        const finding = await telecallerAdminService.createFieldFinding(input.farmerId, leadId ?? null, {
            blockId: input.blockId,
            blockName: input.blockName,
            cropType: input.cropType,
            observations: input.observations,
            diseasePest: input.diseasePest,
            diseaseTone: input.diseaseTone,
            actionTaken: input.actionTaken,
            parameters,
            photoUrls,
            agronomistName: input.agronomistName,
            agronomistRole: 'Field Agronomist',
        });
        return { finding, photoUrls };
    },
    async listRecentVisits(_agronomistEmail, limit = 15) {
        const { data, error } = await supabase
            .from('crm_field_findings')
            .select('id, farmer_id, block_name, crop_type, disease_pest, visited_at, photo_urls, farmers(name, phone)')
            .is('archived_at', null)
            .order('visited_at', { ascending: false })
            .limit(limit);
        throwIfSupabaseError(error, 'Could not load recent visits');
        return data ?? [];
    },
};
//# sourceMappingURL=field-pwa.service.js.map