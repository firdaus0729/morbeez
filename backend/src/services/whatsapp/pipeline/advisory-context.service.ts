import { supabase } from '../../../lib/supabase.js';

/** Minimal context for OpenAI — avoids sending full chat history (token cost). */
export async function fetchCompactFarmerContext(farmerId: string): Promise<{
  cropType: string;
  cropStage?: string;
  recentIssues: string;
  lastSpray?: string;
}> {
  const { data: crops } = await supabase
    .from('farmer_crops')
    .select('crop_type, stage, is_primary')
    .eq('farmer_id', farmerId)
    .order('is_primary', { ascending: false })
    .limit(3);

  const primary = crops?.find((c) => c.is_primary) ?? crops?.[0];
  const cropType = primary?.crop_type ?? 'ginger';
  const cropStage = primary?.stage ?? undefined;

  const { data: history } = await supabase
    .from('disease_history')
    .select('issue_label, severity, recorded_at')
    .eq('farmer_id', farmerId)
    .order('recorded_at', { ascending: false })
    .limit(3);

  const recentIssues = history?.length
    ? history.map((h) => `${h.issue_label} (${h.severity ?? 'unknown'})`).join('; ')
    : 'none';

  let lastSpray: string | undefined;
  const { data: sessions } = await supabase
    .from('ai_advisory_sessions')
    .select('id')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false })
    .limit(1);

  const sessionId = sessions?.[0]?.id;
  if (sessionId) {
    const { data: recs } = await supabase
      .from('ai_product_recommendations')
      .select('dosage_schedule')
      .eq('session_id', sessionId)
      .limit(1);
    if (recs?.[0]?.dosage_schedule) {
      lastSpray = JSON.stringify(recs[0].dosage_schedule).slice(0, 200);
    }
  }

  return { cropType, cropStage, recentIssues, lastSpray };
}

export function formatCompactHistory(ctx: {
  recentIssues: string;
  lastSpray?: string;
}): string {
  const parts = [`Recent issues: ${ctx.recentIssues}`];
  if (ctx.lastSpray) parts.push(`Last spray guidance: ${ctx.lastSpray}`);
  return parts.join('\n');
}
