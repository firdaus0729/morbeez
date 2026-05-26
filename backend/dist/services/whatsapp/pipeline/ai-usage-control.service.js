import { env } from '../../../config/env.js';
import { supabase } from '../../../lib/supabase.js';
function todayDate() {
    return new Date().toISOString().slice(0, 10);
}
async function getOrCreateUsage(farmerId) {
    const usageDate = todayDate();
    const { data } = await supabase
        .from('farmer_ai_usage_daily')
        .select('*')
        .eq('farmer_id', farmerId)
        .eq('usage_date', usageDate)
        .maybeSingle();
    if (data)
        return data;
    const { data: inserted } = await supabase
        .from('farmer_ai_usage_daily')
        .insert({ farmer_id: farmerId, usage_date: usageDate })
        .select()
        .single();
    return inserted;
}
export const aiUsageControlService = {
    async checkAndConsume(params) {
        const row = await getOrCreateUsage(params.farmerId);
        const now = Date.now();
        const minGapMs = env.AI_MIN_REQUEST_INTERVAL_SEC * 1000;
        if (row.last_request_at) {
            const last = new Date(row.last_request_at).getTime();
            if (now - last < minGapMs) {
                await this.recordBlocked(params.farmerId);
                return { allowed: false, reason: 'rate_limit' };
            }
        }
        const textLimit = params.isPremium ? env.AI_DAILY_TEXT_LIMIT_PREMIUM : env.AI_DAILY_TEXT_LIMIT_FREE;
        const imageLimit = params.isPremium ? env.AI_DAILY_IMAGE_LIMIT_PREMIUM : env.AI_DAILY_IMAGE_LIMIT_FREE;
        const voiceLimit = params.isPremium ? env.AI_DAILY_VOICE_LIMIT_PREMIUM : env.AI_DAILY_VOICE_LIMIT_FREE;
        if (params.kind === 'text' && row.text_queries >= textLimit) {
            await this.recordBlocked(params.farmerId);
            return { allowed: false, reason: 'daily_text' };
        }
        if (params.kind === 'image' && row.image_queries >= imageLimit) {
            await this.recordBlocked(params.farmerId);
            return { allowed: false, reason: 'daily_image' };
        }
        if (params.kind === 'voice') {
            if ((params.voiceDurationSec ?? 0) > env.AI_MAX_VOICE_DURATION_SEC) {
                await this.recordBlocked(params.farmerId);
                return { allowed: false, reason: 'voice_too_long' };
            }
            if (row.voice_queries >= voiceLimit) {
                await this.recordBlocked(params.farmerId);
                return { allowed: false, reason: 'daily_voice' };
            }
        }
        const patch = {
            last_request_at: new Date().toISOString(),
        };
        if (params.kind === 'text')
            patch.text_queries = row.text_queries + 1;
        if (params.kind === 'image')
            patch.image_queries = row.image_queries + 1;
        if (params.kind === 'voice') {
            patch.voice_queries = row.voice_queries + 1;
            patch.voice_seconds = row.voice_seconds + (params.voiceDurationSec ?? 0);
        }
        await supabase
            .from('farmer_ai_usage_daily')
            .update(patch)
            .eq('farmer_id', params.farmerId)
            .eq('usage_date', todayDate());
        return { allowed: true };
    },
    async recordBlocked(farmerId) {
        const row = await getOrCreateUsage(farmerId);
        await supabase
            .from('farmer_ai_usage_daily')
            .update({ blocked_requests: row.blocked_requests + 1 })
            .eq('farmer_id', farmerId)
            .eq('usage_date', todayDate());
    },
    usageLimitMessage(language, reason) {
        const en = {
            rate_limit: 'Please wait a moment before sending another message.',
            daily_text: 'Daily advisory limit reached. Try again tomorrow or type "call" for human support.',
            daily_image: 'Daily image analysis limit reached. Try again tomorrow or request a callback.',
            daily_voice: 'Daily voice note limit reached. Send text or a photo instead.',
            voice_too_long: `Voice notes must be under ${env.AI_MAX_VOICE_DURATION_SEC} seconds.`,
        };
        const ml = {
            rate_limit: 'ഒരു നിമിഷം കാത്തിരുന്ന് വീണ്ടും ശ്രമിക്കുക.',
            daily_text: 'ഇന്നത്തെ ഉപദേശ പരിധി കഴിഞ്ഞു. നാളെ വീണ്ടും ശ്രമിക്കുക അല്ലെങ്കിൽ "call" ടൈപ്പ് ചെയ്യുക.',
            daily_image: 'ഇന്നത്തെ ചിത്ര വിശകലന പരിധി കഴിഞ്ഞു. "call" ടൈപ്പ് ചെയ്ത് സഹായം നേടുക.',
            daily_voice: 'ഇന്നത്തെ വോയ്സ് പരിധി കഴിഞ്ഞു. ടെക്സ്റ്റ് അല്ലെങ്കിൽ ഫോട്ടോ അയയ്ക്കുക.',
            voice_too_long: `വോയ്സ് നോട്ട് ${env.AI_MAX_VOICE_DURATION_SEC} സെക്കൻഡിൽ കുറവായിരിക്കണം.`,
        };
        const table = language === 'ml' ? ml : en;
        return table[reason] ?? en[reason];
    },
};
//# sourceMappingURL=ai-usage-control.service.js.map