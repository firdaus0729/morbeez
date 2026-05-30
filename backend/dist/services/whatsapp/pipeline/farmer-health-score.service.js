import { supabase } from '../../../lib/supabase.js';
/**
 * Lightweight engagement health for telecaller prioritization (computed, not stored).
 */
export const farmerHealthScoreService = {
    async compute(farmerId) {
        const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const factors = [];
        let score = 70;
        const { count: inbound30 } = await supabase
            .from('interaction_logs')
            .select('id', { count: 'exact', head: true })
            .eq('farmer_id', farmerId)
            .eq('channel', 'whatsapp')
            .eq('direction', 'inbound')
            .gte('created_at', since30);
        const replies = inbound30 ?? 0;
        if (replies >= 5) {
            score += 10;
            factors.push('active_whatsapp');
        }
        else if (replies === 0) {
            score -= 15;
            factors.push('inactive_30d');
        }
        const { count: openRecs } = await supabase
            .from('recommendation_records')
            .select('id', { count: 'exact', head: true })
            .eq('farmer_id', farmerId)
            .in('status', ['communicated', 'approved'])
            .gte('created_at', since30);
        if ((openRecs ?? 0) > 0) {
            score -= 8;
            factors.push('open_recommendations');
        }
        const { count: pendingTasks } = await supabase
            .from('crm_tasks')
            .select('id', { count: 'exact', head: true })
            .eq('farmer_id', farmerId)
            .eq('status', 'pending');
        if ((pendingTasks ?? 0) >= 2) {
            score -= 10;
            factors.push('pending_crm_tasks');
        }
        const { count: orders30 } = await supabase
            .from('commerce_orders')
            .select('id', { count: 'exact', head: true })
            .eq('farmer_id', farmerId)
            .gte('created_at', since30);
        if ((orders30 ?? 0) > 0) {
            score += 8;
            factors.push('recent_order');
        }
        score = Math.max(0, Math.min(100, score));
        const band = score >= 65 ? 'healthy' : score >= 45 ? 'watch' : 'at_risk';
        return { score, band, factors };
    },
    telecallerPriorityFromHealth(band) {
        return band === 'at_risk' ? 'high' : 'normal';
    },
};
//# sourceMappingURL=farmer-health-score.service.js.map