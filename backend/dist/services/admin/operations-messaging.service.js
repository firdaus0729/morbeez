import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError } from '../../lib/errors.js';
export const operationsMessagingService = {
    async listQuickReplies(category) {
        let q = supabase
            .from('whatsapp_quick_replies')
            .select('*')
            .order('sort_order')
            .order('shortcut_key');
        if (category && category !== 'all')
            q = q.eq('category', category);
        const { data, error } = await q;
        throwIfSupabaseError(error, 'Could not load quick replies');
        return data ?? [];
    },
    async upsertQuickReply(row) {
        const payload = {
            shortcut_key: row.shortcutKey.trim(),
            category: row.category ?? 'general',
            label_en: row.labelEn,
            body_en: row.bodyEn,
            body_ml: row.bodyMl ?? null,
            body_ta: row.bodyTa ?? null,
            body_kn: row.bodyKn ?? null,
            body_hi: row.bodyHi ?? null,
            active: row.active ?? true,
            sort_order: row.sortOrder ?? 0,
            updated_at: new Date().toISOString(),
        };
        if (row.id) {
            const { data, error } = await supabase
                .from('whatsapp_quick_replies')
                .update(payload)
                .eq('id', row.id)
                .select('*')
                .single();
            throwIfSupabaseError(error, 'Could not update quick reply');
            return data;
        }
        const { data, error } = await supabase
            .from('whatsapp_quick_replies')
            .insert(payload)
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not create quick reply');
        return data;
    },
    async deleteQuickReply(id) {
        const { error } = await supabase.from('whatsapp_quick_replies').delete().eq('id', id);
        throwIfSupabaseError(error, 'Could not delete quick reply');
    },
    /** Resolve body for a language (falls back to English). */
    resolveQuickReplyBody(row, language) {
        const map = {
            en: row.body_en,
            ml: row.body_ml,
            ta: row.body_ta,
            kn: row.body_kn,
            hi: row.body_hi,
        };
        return map[language]?.trim() || row.body_en;
    },
    async listLanguageTemplates(params) {
        let q = supabase
            .from('whatsapp_language_templates')
            .select('*')
            .order('template_key')
            .order('language');
        if (params?.templateKey)
            q = q.eq('template_key', params.templateKey);
        if (params?.language)
            q = q.eq('language', params.language);
        if (params?.status && params.status !== 'all')
            q = q.eq('status', params.status);
        const { data, error } = await q;
        throwIfSupabaseError(error, 'Could not load language templates');
        return data ?? [];
    },
    async upsertLanguageTemplate(row) {
        const payload = {
            template_key: row.templateKey.trim(),
            language: row.language,
            channel: row.channel ?? 'session',
            body_text: row.bodyText,
            header_text: row.headerText ?? null,
            footer_text: row.footerText ?? null,
            meta_template_name: row.metaTemplateName ?? null,
            variable_hints: row.variableHints ?? [],
            status: row.status ?? 'draft',
            active: row.active ?? true,
            notes: row.notes ?? null,
            updated_at: new Date().toISOString(),
        };
        if (row.id) {
            const { data, error } = await supabase
                .from('whatsapp_language_templates')
                .update(payload)
                .eq('id', row.id)
                .select('*')
                .single();
            throwIfSupabaseError(error, 'Could not update language template');
            return data;
        }
        const { data, error } = await supabase
            .from('whatsapp_language_templates')
            .insert(payload)
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not create language template');
        return data;
    },
    async deleteLanguageTemplate(id) {
        const { error } = await supabase.from('whatsapp_language_templates').delete().eq('id', id);
        throwIfSupabaseError(error, 'Could not delete language template');
    },
    async listAutomationJobs(params) {
        const limit = Math.min(params.limit ?? 50, 100);
        const page = Math.max(1, params.page ?? 1);
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        let q = supabase
            .from('advisory_automation_jobs')
            .select('*, farmers(id, phone, name, first_name, last_name, district, preferred_language)', { count: 'exact' })
            .order('scheduled_at', { ascending: false })
            .range(from, to);
        if (params.status && params.status !== 'all') {
            if (params.status === 'active') {
                q = q.in('status', ['pending', 'processing']);
            }
            else {
                q = q.eq('status', params.status);
            }
        }
        if (params.jobType && params.jobType !== 'all')
            q = q.eq('job_type', params.jobType);
        const { data, error, count } = await q;
        throwIfSupabaseError(error, 'Could not load automation jobs');
        const jobs = (data ?? []).map((row) => {
            const farmer = row.farmers;
            const first = String(farmer?.first_name ?? '').trim();
            const last = String(farmer?.last_name ?? '').trim();
            const name = [first, last].filter(Boolean).join(' ') || String(farmer?.name ?? '').trim() || 'Farmer';
            return {
                ...row,
                farmerName: name,
                farmerPhone: farmer?.phone ?? null,
                farmerDistrict: farmer?.district ?? null,
                farmers: undefined,
            };
        });
        return {
            jobs,
            pagination: {
                page,
                limit,
                total: count ?? 0,
                pages: Math.max(1, Math.ceil((count ?? 0) / limit)),
            },
        };
    },
    async getAutomationStats() {
        const statuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
        const counts = {};
        await Promise.all(statuses.map(async (s) => {
            const { count } = await supabase
                .from('advisory_automation_jobs')
                .select('id', { count: 'exact', head: true })
                .eq('status', s);
            counts[s] = count ?? 0;
        }));
        const { count: dueNow } = await supabase
            .from('advisory_automation_jobs')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending')
            .lte('scheduled_at', new Date().toISOString());
        return { ...counts, dueNow: dueNow ?? 0 };
    },
    async cancelAutomationJob(id) {
        const { data, error } = await supabase
            .from('advisory_automation_jobs')
            .update({ status: 'cancelled' })
            .eq('id', id)
            .in('status', ['pending', 'processing'])
            .select('*')
            .single();
        if (error || !data)
            throw new NotFoundError('Job not found or cannot cancel');
        return data;
    },
    async retryAutomationJob(id) {
        const { data, error } = await supabase
            .from('advisory_automation_jobs')
            .update({
            status: 'pending',
            scheduled_at: new Date().toISOString(),
            attempts: 0,
            last_error: null,
            completed_at: null,
        })
            .eq('id', id)
            .in('status', ['failed', 'cancelled', 'completed'])
            .select('*')
            .single();
        if (error || !data)
            throw new NotFoundError('Job not found or cannot retry');
        return data;
    },
};
//# sourceMappingURL=operations-messaging.service.js.map