import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError } from '../../lib/errors.js';
export const agIntelligenceService = {
    // ─── Weather rules ───────────────────────────────────────────
    async listWeatherRules(params) {
        let q = supabase
            .from('weather_rule_definitions')
            .select('*')
            .order('rule_key')
            .order('version', { ascending: false })
            .limit(200);
        if (params?.status && params.status !== 'all')
            q = q.eq('status', params.status);
        if (params?.cropType)
            q = q.eq('crop_type', params.cropType);
        const { data, error } = await q;
        throwIfSupabaseError(error, 'Could not load weather rules');
        return data ?? [];
    },
    async upsertWeatherRule(row) {
        const payload = {
            rule_key: row.ruleKey,
            version: row.version ?? 1,
            crop_type: row.cropType ?? null,
            condition_json: row.conditionJson ?? {},
            action_type: row.actionType,
            action_payload: row.actionPayload ?? {},
            priority: row.priority ?? 50,
            status: row.status ?? 'draft',
            notes: row.notes ?? null,
            updated_at: new Date().toISOString(),
            ...(row.status === 'approved' && row.approvedBy
                ? { approved_by: row.approvedBy, approved_at: new Date().toISOString() }
                : {}),
        };
        if (row.id) {
            const { data, error } = await supabase
                .from('weather_rule_definitions')
                .update(payload)
                .eq('id', row.id)
                .select('*')
                .single();
            throwIfSupabaseError(error, 'Could not update weather rule');
            return data;
        }
        const { data, error } = await supabase
            .from('weather_rule_definitions')
            .insert({ ...payload, created_by: row.approvedBy })
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not create weather rule');
        return data;
    },
    // ─── Cultivation tasks ───────────────────────────────────────
    async listCultivationTasks(cropType) {
        let q = supabase
            .from('cultivation_task_master')
            .select('*')
            .order('crop_type')
            .order('priority', { ascending: false });
        if (cropType)
            q = q.eq('crop_type', cropType);
        const { data, error } = await q;
        throwIfSupabaseError(error, 'Could not load cultivation tasks');
        return data ?? [];
    },
    async upsertCultivationTask(row) {
        const payload = {
            crop_type: row.cropType,
            task_key: row.taskKey,
            title_en: row.titleEn,
            title_ml: row.titleMl ?? null,
            instructions_en: row.instructionsEn ?? null,
            instructions_ml: row.instructionsMl ?? null,
            target_dap_min: row.targetDapMin ?? null,
            target_dap_max: row.targetDapMax ?? null,
            growth_stage: row.growthStage ?? null,
            priority: row.priority ?? 50,
            active: row.active ?? true,
            updated_at: new Date().toISOString(),
        };
        if (row.id) {
            const { data, error } = await supabase
                .from('cultivation_task_master')
                .update(payload)
                .eq('id', row.id)
                .select('*')
                .single();
            throwIfSupabaseError(error, 'Could not update cultivation task');
            return data;
        }
        const { data, error } = await supabase
            .from('cultivation_task_master')
            .insert(payload)
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not create cultivation task');
        return data;
    },
    // ─── Recommendation templates ────────────────────────────────
    async listRecommendationTemplates(params) {
        let q = supabase
            .from('recommendation_templates')
            .select('*')
            .order('crop_type')
            .order('issue_key');
        if (params?.status && params.status !== 'all')
            q = q.eq('status', params.status);
        if (params?.cropType)
            q = q.eq('crop_type', params.cropType);
        const { data, error } = await q;
        throwIfSupabaseError(error, 'Could not load recommendation templates');
        return data ?? [];
    },
    async upsertRecommendationTemplate(row) {
        const payload = {
            crop_type: row.cropType,
            issue_key: row.issueKey,
            issue_label_en: row.issueLabelEn ?? row.issueKey,
            recommendation_text_en: row.recommendationTextEn,
            recommendation_text_ml: row.recommendationTextMl ?? null,
            products: row.products ?? [],
            application_type: row.applicationType ?? null,
            status: row.status ?? 'draft',
            updated_at: new Date().toISOString(),
            ...(row.status === 'approved' && row.approvedBy
                ? { approved_by: row.approvedBy, approved_at: new Date().toISOString() }
                : {}),
        };
        if (row.id) {
            const { data, error } = await supabase
                .from('recommendation_templates')
                .update(payload)
                .eq('id', row.id)
                .select('*')
                .single();
            throwIfSupabaseError(error, 'Could not update template');
            return data;
        }
        const { data, error } = await supabase
            .from('recommendation_templates')
            .insert(payload)
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not create template');
        return data;
    },
    // ─── Spray compatibility ─────────────────────────────────────
    async listSprayCompatibility() {
        const { data, error } = await supabase
            .from('spray_compatibility_rules')
            .select('*')
            .order('product_a');
        throwIfSupabaseError(error, 'Could not load spray compatibility');
        return data ?? [];
    },
    async upsertSprayCompatibility(row) {
        const payload = {
            product_a: row.productA.trim(),
            product_b: row.productB.trim(),
            compatible: row.compatible,
            min_interval_hours: row.minIntervalHours ?? null,
            notes: row.notes ?? null,
            active: row.active ?? true,
            updated_at: new Date().toISOString(),
        };
        if (row.id) {
            const { data, error } = await supabase
                .from('spray_compatibility_rules')
                .update(payload)
                .eq('id', row.id)
                .select('*')
                .single();
            throwIfSupabaseError(error, 'Could not update compatibility rule');
            return data;
        }
        const { data, error } = await supabase
            .from('spray_compatibility_rules')
            .insert(payload)
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not create compatibility rule');
        return data;
    },
    // ─── Resistance rotation ─────────────────────────────────────
    async listResistanceRotation(cropType) {
        let q = supabase
            .from('resistance_rotation_groups')
            .select('*')
            .order('crop_type')
            .order('mode_of_action')
            .order('rotation_order');
        if (cropType)
            q = q.eq('crop_type', cropType);
        const { data, error } = await q;
        throwIfSupabaseError(error, 'Could not load resistance rotation');
        return data ?? [];
    },
    async upsertResistanceRotation(row) {
        const payload = {
            crop_type: row.cropType,
            mode_of_action: row.modeOfAction,
            rotation_order: row.rotationOrder,
            technical_name: row.technicalName,
            notes: row.notes ?? null,
            active: row.active ?? true,
            updated_at: new Date().toISOString(),
        };
        if (row.id) {
            const { data, error } = await supabase
                .from('resistance_rotation_groups')
                .update(payload)
                .eq('id', row.id)
                .select('*')
                .single();
            throwIfSupabaseError(error, 'Could not update rotation entry');
            return data;
        }
        const { data, error } = await supabase
            .from('resistance_rotation_groups')
            .insert(payload)
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not create rotation entry');
        return data;
    },
    async deleteRow(table, id) {
        const allowed = [
            'cultivation_task_master',
            'recommendation_templates',
            'spray_compatibility_rules',
            'resistance_rotation_groups',
            'weather_rule_definitions',
        ];
        if (!allowed.includes(table))
            throw new NotFoundError('Invalid table');
        const { error } = await supabase.from(table).delete().eq('id', id);
        throwIfSupabaseError(error, 'Could not delete');
    },
};
//# sourceMappingURL=ag-intelligence.service.js.map