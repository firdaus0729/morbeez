import { supabase } from '../../../lib/supabase.js';

const DEFAULT_IGNORED_OUTBOUND_THRESHOLD = 3;
const LOOKBACK_DAYS = 14;

/**
 * Reduces proactive WhatsApp noise when farmers repeatedly ignore outbound messages.
 */
export const messageFatigueService = {
  async getEngagementLevel(farmerId: string): Promise<'high' | 'medium' | 'low'> {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: logs } = await supabase
      .from('interaction_logs')
      .select('direction, created_at')
      .eq('farmer_id', farmerId)
      .eq('channel', 'whatsapp')
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(200);

    if (!logs?.length) return 'medium';

    let consecutiveIgnoredOutbound = 0;
    let maxIgnoredStreak = 0;
    let farmerReplies = 0;
    let outboundCount = 0;

    for (const row of logs) {
      if (row.direction === 'outbound') {
        outboundCount += 1;
        consecutiveIgnoredOutbound += 1;
        maxIgnoredStreak = Math.max(maxIgnoredStreak, consecutiveIgnoredOutbound);
      } else {
        farmerReplies += 1;
        consecutiveIgnoredOutbound = 0;
      }
    }

    if (maxIgnoredStreak >= DEFAULT_IGNORED_OUTBOUND_THRESHOLD && farmerReplies === 0) {
      return 'low';
    }
    if (farmerReplies >= 3 || (farmerReplies > 0 && farmerReplies / Math.max(outboundCount, 1) >= 0.35)) {
      return 'high';
    }
    return 'medium';
  },

  async shouldReduceProactiveMessages(farmerId: string): Promise<boolean> {
    const level = await this.getEngagementLevel(farmerId);
    return level === 'low';
  },
};
