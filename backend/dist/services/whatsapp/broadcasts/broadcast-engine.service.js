import { supabase } from '../../../lib/supabase.js';
import { logger } from '../../../lib/logger.js';
import { whatsappService } from '../whatsapp.service.js';
import { farmerService } from '../../farmer/farmer.service.js';
import { formatBroadcastMessage, } from './broadcast-copy.js';
import { broadcastThrottleService } from './broadcast-throttle.service.js';
import { computeDap, dapInTargetRange, todayIsoWeekday } from './dap.service.js';
import { weatherAlertsService } from '../scenarios/weather-alerts.service.js';
export const broadcastEngineService = {
    async loadActiveRules() {
        const { data, error } = await supabase
            .from('crop_dap_broadcast_rules')
            .select('id, crop_type, broadcast_kind, target_dap, dap_tolerance, min_dap, max_dap, weekday, priority')
            .eq('active', true)
            .order('priority', { ascending: false });
        if (error)
            throw error;
        return (data ?? []);
    },
    matchRulesForFarmer(rules, crops, isoWeekday) {
        const matches = [];
        const primary = crops.find((c) => c.is_primary) ?? crops[0];
        if (!primary)
            return matches;
        for (const rule of rules) {
            if (rule.broadcast_kind === 'cultivation_schedule') {
                if (rule.weekday != null && rule.weekday !== isoWeekday)
                    continue;
                const crop = rule.crop_type === 'all'
                    ? primary
                    : crops.find((c) => c.crop_type === rule.crop_type);
                if (!crop)
                    continue;
                matches.push({
                    rule,
                    crop,
                    dap: computeDap(crop.planting_date ?? crop.planted_at ?? null, crop.created_at),
                });
                continue;
            }
            for (const crop of crops) {
                if (rule.crop_type !== 'all' && crop.crop_type !== rule.crop_type)
                    continue;
                const dap = computeDap(crop.planting_date ?? crop.planted_at ?? null, crop.created_at);
                if (dapInTargetRange(dap, rule)) {
                    matches.push({ rule, crop, dap });
                    break;
                }
            }
        }
        matches.sort((a, b) => b.rule.priority - a.rule.priority);
        return matches;
    },
    /** Scenario 26 — prepend severe weather line when heavy rain expected. */
    async maybeMergeWeatherAlert(farmerId, language, body) {
        try {
            const weather = await weatherAlertsService.formatForFarmer(farmerId, language);
            if (/Heavy rain expected|വഷം മഴ|भारी बारिश/i.test(weather)) {
                const firstLine = weather.split('\n').slice(0, 6).join('\n');
                return `${firstLine}\n\n---\n\n${body}`;
            }
        }
        catch {
            /* optional merge */
        }
        return body;
    },
    async sendToFarmer(params) {
        const kind = params.rule.broadcast_kind;
        const cropType = params.crop.crop_type;
        let body = formatBroadcastMessage(kind, params.farmer.language, {
            crop: cropType,
            dap: params.dap,
            district: params.farmer.district ?? undefined,
        });
        if (params.mergeWeather && kind === 'cultivation_schedule') {
            body = await this.maybeMergeWeatherAlert(params.farmer.id, params.farmer.language, body);
        }
        const throttle = await broadcastThrottleService.shouldSend({
            farmerId: params.farmer.id,
            broadcastKind: kind,
            cropType: params.rule.crop_type === 'all' ? cropType : params.rule.crop_type,
            priority: params.rule.priority,
        });
        if (!throttle.allowed) {
            if (!params.dryRun) {
                await broadcastThrottleService.logSkipped({
                    farmerId: params.farmer.id,
                    broadcastKind: kind,
                    cropType,
                    dap: params.dap,
                    ruleId: params.rule.id,
                    messageBody: body,
                    skipReason: throttle.reason,
                    priority: params.rule.priority,
                });
            }
            return 'skipped';
        }
        if (params.dryRun)
            return 'sent';
        try {
            await whatsappService.sendText(params.farmer.phone, body);
            await broadcastThrottleService.logSent({
                farmerId: params.farmer.id,
                broadcastKind: kind,
                cropType,
                dap: params.dap,
                ruleId: params.rule.id,
                messageBody: body,
                priority: params.rule.priority,
            });
            await farmerService
                .logInteraction(params.farmer.id, 'whatsapp', 'outbound', `[broadcast:${kind}] ${body.slice(0, 200)}`)
                .catch(() => { });
            return 'sent';
        }
        catch (err) {
            const msg = String(err);
            await broadcastThrottleService.logFailed({
                farmerId: params.farmer.id,
                broadcastKind: kind,
                cropType,
                messageBody: body,
                error: msg,
                priority: params.rule.priority,
            });
            logger.error({ err, farmerId: params.farmer.id, kind }, 'Broadcast send failed');
            return 'failed';
        }
    },
    async runDailyBroadcasts(options) {
        const result = {
            farmersScanned: 0,
            sent: 0,
            skipped: 0,
            failed: 0,
            errors: [],
        };
        const rules = await this.loadActiveRules();
        const filteredRules = options?.kinds?.length
            ? rules.filter((r) => options.kinds.includes(r.broadcast_kind))
            : rules;
        if (!filteredRules.length) {
            result.errors.push('No active broadcast rules');
            return result;
        }
        let farmerQuery = supabase
            .from('farmers')
            .select('id, phone, preferred_language, district, farm_blocks(crop_type, planting_date, created_at, is_primary, archived_at)')
            .not('phone', 'is', null);
        if (options?.farmerId) {
            farmerQuery = farmerQuery.eq('id', options.farmerId);
        }
        const { data: farmers, error } = await farmerQuery.limit(options?.farmerId ? 1 : 5000);
        if (error) {
            result.errors.push(error.message);
            return result;
        }
        const isoWeekday = todayIsoWeekday();
        for (const row of farmers ?? []) {
            if (!row.phone)
                continue;
            result.farmersScanned++;
            const language = (row.preferred_language ?? 'en');
            const crops = (row.farm_blocks ?? []).filter((b) => !b.archived_at);
            if (!crops.length)
                continue;
            const farmer = {
                id: row.id,
                phone: String(row.phone).replace(/\D/g, ''),
                language,
                district: row.district,
            };
            const matches = this.matchRulesForFarmer(filteredRules, crops, isoWeekday);
            if (!matches.length)
                continue;
            // At most one broadcast per farmer per run (highest priority match)
            const best = matches[0];
            const status = await this.sendToFarmer({
                farmer,
                rule: best.rule,
                crop: best.crop,
                dap: best.dap,
                dryRun: options?.dryRun,
                mergeWeather: best.rule.broadcast_kind === 'cultivation_schedule',
            });
            if (status === 'sent')
                result.sent++;
            else if (status === 'skipped')
                result.skipped++;
            else
                result.failed++;
        }
        logger.info(result, 'WhatsApp broadcast run completed');
        return result;
    },
};
//# sourceMappingURL=broadcast-engine.service.js.map