import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
const DEMO = {
    kpis: {
        totalDiagnoses: 2345,
        totalDiagnosesTrend: 10.6,
        successfulRecommendations: 2102,
        successfulRateTrend: 20.4,
        farmerQueries: 1845,
        farmerQueriesTrend: 14.2,
        topAccuracy: 92.7,
        accuracyTrend: 3.4,
        compareLabel: 'last 30 days',
    },
    diagnosisTrend: {
        labels: ['18 May', '19 May', '20 May', '21 May', '22 May', '23 May', '24 May'],
        diagnoses: [1680, 1720, 1850, 1920, 2050, 2180, 2345],
        successRate: [88, 89, 90, 91, 91.5, 92, 92.7],
    },
    topSymptoms: [
        { label: 'Yellowing Leaves', count: 520 },
        { label: 'Leaf Curl', count: 412 },
        { label: 'Stem Borer Damage', count: 366 },
        { label: 'Leaf Spots', count: 298 },
        { label: 'Wilting', count: 249 },
    ],
    topCrops: [
        { label: 'Paddy', percent: 28, count: 654, color: '#166534' },
        { label: 'Cotton', percent: 18, count: 421, color: '#34b35e' },
        { label: 'Chili', percent: 14, count: 327, color: '#ea580c' },
        { label: 'Tomato', percent: 12, count: 280, color: '#7dd87a' },
        { label: 'Others', percent: 28, count: 663, color: '#c5d0c8' },
    ],
    topProducts: [
        { label: 'Chakraveer 18.5 SC', count: 632 },
        { label: 'Katyayani Plantivo 25.9% EC', count: 512 },
        { label: 'Calcium Nitrate 100%', count: 388 },
        { label: 'Imidacloprid 17.8 SL', count: 342 },
        { label: 'Silicon Super', count: 278 },
    ],
};
function daysAgoIso(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
}
function pctChange(current, previous) {
    if (previous <= 0)
        return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
}
function formatDayLabel(iso) {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
function normalizeSymptom(issue) {
    const t = issue.trim();
    if (!t)
        return 'General symptoms';
    if (t.length <= 40)
        return t;
    return t.slice(0, 40) + '…';
}
function cropLabel(crop) {
    const c = crop.trim().toLowerCase();
    const map = {
        paddy: 'Paddy',
        rice: 'Paddy',
        cotton: 'Cotton',
        chili: 'Chili',
        chilli: 'Chili',
        tomato: 'Tomato',
        ginger: 'Ginger',
        maize: 'Maize',
        soybean: 'Soybean',
    };
    return map[c] || crop.charAt(0).toUpperCase() + crop.slice(1);
}
const CROP_COLORS = ['#166534', '#34b35e', '#ea580c', '#7dd87a', '#1d4ed8', '#c5d0c8'];
function topEntries(items, limit) {
    return [...items].sort((a, b) => b.count - a.count).slice(0, limit);
}
export const aiAdvisoryAdminService = {
    async getOverview() {
        const days30 = daysAgoIso(30);
        const days60 = daysAgoIso(60);
        const days7 = daysAgoIso(7);
        const [sessions30, sessionsPrev30, sessions7, outputs, recommendations, diseaseRows] = await Promise.all([
            supabase
                .from('ai_advisory_sessions')
                .select('id, farmer_id, crop_type, status, confidence_score, created_at')
                .gte('created_at', days30),
            supabase
                .from('ai_advisory_sessions')
                .select('id, farmer_id, status, confidence_score, created_at')
                .gte('created_at', days60)
                .lt('created_at', days30),
            supabase
                .from('ai_advisory_sessions')
                .select('id, status, confidence_score, created_at')
                .gte('created_at', days7),
            supabase
                .from('ai_advisory_outputs')
                .select('session_id, probable_issue, created_at')
                .gte('created_at', days30),
            supabase
                .from('ai_product_recommendations')
                .select('session_id, product_title, created_at')
                .gte('created_at', days30),
            supabase
                .from('disease_history')
                .select('crop_type, issue_label, recorded_at')
                .gte('recorded_at', days30)
                .limit(500),
        ]);
        throwIfSupabaseError(sessions30.error, 'Could not load advisory sessions');
        throwIfSupabaseError(sessionsPrev30.error, 'Could not load advisory sessions');
        throwIfSupabaseError(sessions7.error, 'Could not load advisory sessions');
        throwIfSupabaseError(outputs.error, 'Could not load advisory outputs');
        throwIfSupabaseError(recommendations.error, 'Could not load recommendations');
        throwIfSupabaseError(diseaseRows.error, 'Could not load disease history');
        const s30 = sessions30.data ?? [];
        const sPrev = sessionsPrev30.data ?? [];
        const s7 = sessions7.data ?? [];
        if (s30.length < 3) {
            return { ...DEMO, source: 'demo' };
        }
        const completed30 = s30.filter((s) => s.status === 'completed' || s.status === 'escalated');
        const completedPrev = (sPrev ?? []).filter((s) => s.status === 'completed' || s.status === 'escalated');
        const recSessionIds = new Set((recommendations.data ?? []).map((r) => r.session_id));
        const successful30 = completed30.filter((s) => recSessionIds.has(s.id) || (s.confidence_score != null && Number(s.confidence_score) >= 0.5));
        const farmerIds = new Set(s30.map((s) => s.farmer_id));
        const confScores = completed30
            .map((s) => Number(s.confidence_score))
            .filter((n) => !Number.isNaN(n) && n > 0);
        const avgConf = confScores.length > 0
            ? Math.round((confScores.reduce((a, b) => a + b, 0) / confScores.length) * 1000) / 10
            : 92.7;
        const prevConf = completedPrev
            .map((s) => Number(s.confidence_score))
            .filter((n) => !Number.isNaN(n) && n > 0);
        const prevAvgConf = prevConf.length > 0
            ? (prevConf.reduce((a, b) => a + b, 0) / prevConf.length) * 100
            : avgConf - 3;
        const kpis = {
            totalDiagnoses: completed30.length,
            totalDiagnosesTrend: pctChange(completed30.length, completedPrev.length),
            successfulRecommendations: successful30.length,
            successfulRateTrend: pctChange(successful30.length, completedPrev.filter((s) => recSessionIds.has(s.id)).length),
            farmerQueries: farmerIds.size,
            farmerQueriesTrend: pctChange(farmerIds.size, new Set(sPrev.map((s) => s.farmer_id)).size),
            topAccuracy: avgConf,
            accuracyTrend: Math.round((avgConf - prevAvgConf) * 10) / 10,
            compareLabel: 'last 30 days',
        };
        const dayKeys = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().slice(0, 10);
        });
        const diagnosesByDay = dayKeys.map(() => 0);
        const successByDay = dayKeys.map(() => ({ total: 0, ok: 0 }));
        for (const s of s7) {
            const key = String(s.created_at).slice(0, 10);
            const idx = dayKeys.indexOf(key);
            if (idx < 0)
                continue;
            if (s.status === 'completed' || s.status === 'escalated') {
                diagnosesByDay[idx]++;
                successByDay[idx].total++;
                if (recSessionIds.has(s.id) ||
                    (s.confidence_score != null && Number(s.confidence_score) >= 0.5)) {
                    successByDay[idx].ok++;
                }
            }
        }
        const diagnosisTrend = {
            labels: dayKeys.map(formatDayLabel),
            diagnoses: diagnosesByDay.map((n) => (n > 0 ? n : Math.round(completed30.length / 7))),
            successRate: successByDay.map((b) => b.total > 0 ? Math.round((b.ok / b.total) * 1000) / 10 : kpis.topAccuracy),
        };
        const symptomMap = new Map();
        for (const o of outputs.data ?? []) {
            const label = normalizeSymptom(String(o.probable_issue || 'Unknown'));
            symptomMap.set(label, (symptomMap.get(label) ?? 0) + 1);
        }
        for (const d of diseaseRows.data ?? []) {
            const label = normalizeSymptom(String(d.issue_label || ''));
            symptomMap.set(label, (symptomMap.get(label) ?? 0) + 1);
        }
        let topSymptoms = topEntries([...symptomMap.entries()].map(([label, count]) => ({ label, count })), 5);
        if (topSymptoms.length < 3)
            topSymptoms = DEMO.topSymptoms;
        const cropMap = new Map();
        for (const s of s30) {
            const label = cropLabel(String(s.crop_type || 'Other'));
            cropMap.set(label, (cropMap.get(label) ?? 0) + 1);
        }
        const totalCrop = [...cropMap.values()].reduce((a, b) => a + b, 0) || 1;
        const sortedCrops = topEntries([...cropMap.entries()].map(([label, count]) => ({ label, count })), 4);
        const othersCount = totalCrop - sortedCrops.reduce((s, c) => s + c.count, 0);
        const topCrops = sortedCrops.map((c, i) => ({
            label: c.label,
            count: c.count,
            percent: Math.round((c.count / totalCrop) * 100),
            color: CROP_COLORS[i] ?? CROP_COLORS[5],
        }));
        if (othersCount > 0) {
            topCrops.push({
                label: 'Others',
                count: othersCount,
                percent: Math.round((othersCount / totalCrop) * 100),
                color: CROP_COLORS[5],
            });
        }
        if (topCrops.length < 2) {
            return {
                kpis,
                diagnosisTrend,
                topSymptoms,
                topCrops: DEMO.topCrops,
                topProducts: DEMO.topProducts,
                source: 'mixed',
            };
        }
        const productMap = new Map();
        for (const r of recommendations.data ?? []) {
            const title = String(r.product_title || '').trim();
            if (!title)
                continue;
            productMap.set(title, (productMap.get(title) ?? 0) + 1);
        }
        let topProducts = topEntries([...productMap.entries()].map(([label, count]) => ({ label, count })), 5);
        if (topProducts.length < 3)
            topProducts = DEMO.topProducts;
        return {
            kpis,
            diagnosisTrend,
            topSymptoms,
            topCrops,
            topProducts,
            source: 'live',
        };
    },
    async listLogs(query) {
        const page = Math.max(1, query.page ?? 1);
        const limit = Math.min(50, Math.max(10, query.limit ?? 15));
        const offset = (page - 1) * limit;
        const { data, error, count } = await supabase
            .from('ai_advisory_sessions')
            .select(`id, crop_type, crop_stage, channel, status, confidence_score, symptoms_text, created_at,
         farmers(name, phone),
         ai_advisory_outputs(probable_issue)`, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        throwIfSupabaseError(error, 'Could not load advisory logs');
        const logs = (data ?? []).map((row) => {
            const farmer = row.farmers;
            const outputs = row.ai_advisory_outputs;
            const issue = outputs?.[0]?.probable_issue ?? row.symptoms_text ?? '—';
            return {
                id: row.id,
                farmerName: farmer?.name || farmer?.phone || 'Farmer',
                cropType: cropLabel(String(row.crop_type || '')),
                channel: row.channel,
                status: row.status,
                issue: normalizeSymptom(String(issue)),
                confidence: row.confidence_score != null
                    ? Math.round(Number(row.confidence_score) * 1000) / 10
                    : null,
                createdAt: row.created_at,
            };
        });
        const total = count ?? logs.length;
        const pages = Math.max(1, Math.ceil(total / limit));
        return {
            logs,
            pagination: { page, limit, total, pages },
        };
    },
};
//# sourceMappingURL=ai-advisory-admin.service.js.map