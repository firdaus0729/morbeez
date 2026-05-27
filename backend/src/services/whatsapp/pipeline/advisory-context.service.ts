import { supabase } from '../../../lib/supabase.js';
import { blockService } from '../../core/block.service.js';

/** Minimal context for OpenAI — avoids sending full chat history (token cost). */
export async function fetchCompactFarmerContext(
  farmerId: string,
  options?: { activePlotId?: string | null; activeBlockId?: string | null }
): Promise<{
  cropType: string;
  cropStage?: string;
  recentIssues: string;
  lastSpray?: string;
  activePlotId?: string;
  activeBlockId?: string;
  dap?: number;
}> {
  const blockId = options?.activeBlockId ?? options?.activePlotId;

  let cropType = 'ginger';
  let cropStage: string | undefined;
  let activeBlockId: string | undefined;
  let dap: number | undefined;

  if (blockId) {
    const block = await blockService.getById(blockId, farmerId);
    if (block) {
      cropType = block.crop_type;
      cropStage = block.stage ?? undefined;
      activeBlockId = block.id;
      dap = block.dap;
    }
  }

  if (!activeBlockId) {
    const primary = await blockService.getPrimaryBlock(farmerId);
    if (primary) {
      cropType = primary.crop_type;
      cropStage = primary.stage ?? undefined;
      activeBlockId = primary.id;
      dap = primary.dap;
    } else {
      const ensured = await blockService.ensureDefaultBlock(farmerId);
      cropType = ensured.crop_type;
      cropStage = ensured.stage ?? undefined;
      activeBlockId = ensured.id;
      dap = ensured.dap;
    }
  }

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

  return {
    cropType,
    cropStage,
    recentIssues,
    lastSpray,
    activePlotId: activeBlockId,
    activeBlockId,
    dap,
  };
}

export function formatCompactHistory(ctx: {
  recentIssues: string;
  lastSpray?: string;
  dap?: number;
}): string {
  const parts = [`Recent issues: ${ctx.recentIssues}`];
  if (ctx.dap != null) parts.push(`DAP: ${ctx.dap}`);
  if (ctx.lastSpray) parts.push(`Last spray guidance: ${ctx.lastSpray}`);
  return parts.join('\n');
}
