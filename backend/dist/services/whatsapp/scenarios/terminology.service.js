import { supabase } from '../../../lib/supabase.js';
import { isLikelyUnknownRegionalPhrase as isRegionalTermLookup } from '../pipeline/agriculture-free-text.service.js';
import { t } from './whatsapp-flow-copy.js';
/** Scenarios 7–9 — regional terminology mapping. */
const BUILTIN_TERMS = {
    chimb: { meaning: 'new shoot / tiller emergence', crop: 'cardamom' },
    chimbi: { meaning: 'new shoot / tiller emergence', crop: 'cardamom' },
};
export const terminologyService = {
    async resolveTerm(term, language, district, cropType) {
        const key = term.trim().toLowerCase();
        if (BUILTIN_TERMS[key]) {
            return { found: true, meaning: BUILTIN_TERMS[key].meaning, confidence: 0.95 };
        }
        let q = supabase
            .from('agronomy_terms')
            .select('meaning, confidence')
            .eq('term', key)
            .eq('language', language);
        if (cropType)
            q = q.or(`crop_type.is.null,crop_type.eq.${cropType}`);
        const { data } = await q.order('confidence', { ascending: false }).limit(1).maybeSingle();
        if (data?.meaning) {
            return { found: true, meaning: data.meaning, confidence: Number(data.confidence ?? 0.8) };
        }
        if (district) {
            const { data: dRow } = await supabase
                .from('agronomy_terms')
                .select('meaning, confidence')
                .eq('term', key)
                .eq('district', district)
                .limit(1)
                .maybeSingle();
            if (dRow?.meaning) {
                return { found: true, meaning: dRow.meaning, confidence: Number(dRow.confidence ?? 0.75) };
            }
        }
        return { found: false, confidence: 0 };
    },
    async createReviewTask(params) {
        await supabase.from('terminology_review_tasks').insert({
            farmer_id: params.farmerId,
            term: params.term.slice(0, 120),
            language: params.language ?? null,
            crop_type: params.cropType ?? null,
            district: params.district ?? null,
            context_text: params.contextText?.slice(0, 500) ?? null,
            status: 'open',
        });
    },
    isChimbIssue(text) {
        return /\bchimb|chimbi\b/i.test(text) || /ചിമ്പ്|சிம்ப்/i.test(text);
    },
    isLikelyUnknownRegionalPhrase(text) {
        return isRegionalTermLookup(text);
    },
    chimbQuestionCopy(language) {
        return t('chimbQuestion', language);
    },
    chimbAdviceCopy(language) {
        return t('chimbAdvice', language);
    },
    clarifyCopy(language) {
        return t('terminologyClarify', language);
    },
};
//# sourceMappingURL=terminology.service.js.map