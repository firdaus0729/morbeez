import { supabase } from '../../../lib/supabase.js';
import type { AdvisoryLanguage } from '../../ai/types.js';
import { fetchCompactFarmerContext } from './advisory-context.service.js';
import { inferCropHint } from './crop-hints.js';
import { conversationSessionService } from '../conversation-session.service.js';
import { multiPlotService } from '../scenarios/multi-plot.service.js';
import { farmerExperienceLearningService } from '../../core/farmer-experience-learning.service.js';

export type FarmerMemorySnapshot = {
  farmerId: string;
  cropType: string;
  cropStage?: string;
  activePlotId: string | null;
  activePlotLabel?: string;
  dap?: number;
  district?: string;
  recentIssues: string;
  lastSpray?: string;
  lastAdvisorySummary?: string;
  /** Chronological WhatsApp turns (Farmer / Assistant). */
  recentTurns: string[];
  /** Crop is known from plot, session, onboarding, or recent chat — do not re-ask. */
  knownCropLocked: boolean;
  onboardingComplete: boolean;
  /** Agronomist-approved regional cases + local practices for this crop */
  verifiedRegionalHints?: string;
};

async function fetchRecentTurns(farmerId: string, limit = 12): Promise<string[]> {
  const { data } = await supabase
    .from('interaction_logs')
    .select('direction, content')
    .eq('farmer_id', farmerId)
    .eq('channel', 'whatsapp')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!data?.length) return [];
  return [...data]
    .reverse()
    .map((row) => {
      const role = row.direction === 'outbound' ? 'Assistant' : 'Farmer';
      const content = String(row.content ?? '').trim().slice(0, 400);
      return content ? `${role}: ${content}` : '';
    })
    .filter(Boolean);
}

function cropMentionedInTurns(turns: string[]): boolean {
  for (const line of turns) {
    if (inferCropHint(line)) return true;
  }
  return false;
}

/** Recent back-and-forth within 45 minutes — continuation, not a new session. */
const THREAD_WINDOW_MS = 45 * 60 * 1000;

export const farmerMemoryService = {
  async hasRecentThread(farmerId: string): Promise<boolean> {
    const since = new Date(Date.now() - THREAD_WINDOW_MS).toISOString();
    const { data } = await supabase
      .from('interaction_logs')
      .select('direction, created_at')
      .eq('farmer_id', farmerId)
      .eq('channel', 'whatsapp')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(6);

    if (!data?.length || data.length < 2) return false;
    const hasOutbound = data.some((r) => r.direction === 'outbound');
    const hasInbound = data.some((r) => r.direction === 'inbound');
    return hasOutbound && hasInbound;
  },

  async build(
    farmerId: string,
    options?: { symptomsText?: string; activePlotId?: string | null }
  ): Promise<FarmerMemorySnapshot> {
    const sessionCtx = await conversationSessionService.getContext(farmerId);
    const hintedCrop = inferCropHint(options?.symptomsText);
    let activePlotId = options?.activePlotId ?? (await multiPlotService.getActivePlotId(farmerId));

    if (hintedCrop) {
      const plots = await multiPlotService.listPlots(farmerId);
      const matched = plots.find((p) => p.crop_type.toLowerCase() === hintedCrop);
      if (matched) {
        activePlotId = matched.id;
        await multiPlotService.setActivePlot(farmerId, matched);
      }
    }

    if (!activePlotId && sessionCtx.activeCropType) {
      const matchedPlot = await multiPlotService.setActivePlotByCropSlug(
        farmerId,
        sessionCtx.activeCropType
      );
      if (matchedPlot) activePlotId = matchedPlot.id;
    }

    const cropTypeEarly = hintedCrop ?? sessionCtx.activeCropType;
    const compact = await fetchCompactFarmerContext(farmerId, { activePlotId });
    const recentTurns = await fetchRecentTurns(farmerId, 12);

    const cropType = cropTypeEarly ?? compact.cropType;
    const verifiedRegionalHints = await farmerExperienceLearningService
      .getVerifiedRegionalHints(farmerId, cropType)
      .catch(() => null);
    const onboardingComplete = Boolean(sessionCtx.onboardingComplete);

    const knownCropLocked = Boolean(
      activePlotId ||
        sessionCtx.activeCropType ||
        hintedCrop ||
        cropMentionedInTurns(recentTurns) ||
        onboardingComplete
    );

    const { data: farmerRow } = await supabase
      .from('farmers')
      .select('district')
      .eq('id', farmerId)
      .maybeSingle();

    return {
      farmerId,
      cropType,
      cropStage: compact.cropStage,
      activePlotId: activePlotId ?? compact.activePlotId ?? null,
      activePlotLabel: sessionCtx.activePlotLabel,
      dap: compact.dap,
      district: farmerRow?.district ? String(farmerRow.district) : undefined,
      recentIssues: compact.recentIssues,
      lastSpray: compact.lastSpray,
      lastAdvisorySummary: sessionCtx.diagnosis?.lastAdvisorySummary,
      recentTurns,
      knownCropLocked,
      onboardingComplete,
      verifiedRegionalHints: verifiedRegionalHints ?? undefined,
    };
  },

  formatCompactHistory(memory: FarmerMemorySnapshot): string {
    const parts: string[] = [
      `Active crop: ${memory.cropType}${memory.dap != null ? ` (${memory.dap} DAP)` : ''}`,
      memory.activePlotLabel ? `Plot: ${memory.activePlotLabel}` : null,
      memory.district ? `District: ${memory.district}` : null,
      `Recent issues: ${memory.recentIssues}`,
      memory.lastAdvisorySummary
        ? `Last diagnosis summary: ${memory.lastAdvisorySummary.slice(0, 400)}`
        : null,
      memory.lastSpray ? `Last spray guidance: ${memory.lastSpray}` : null,
    ].filter(Boolean) as string[];

    const chat = memory.recentTurns.slice(-6);
    if (chat.length) {
      parts.push(`Recent WhatsApp chat:\n${chat.join('\n')}`);
    }
    if (memory.verifiedRegionalHints?.trim()) {
      parts.push(`Verified regional learnings:\n${memory.verifiedRegionalHints.trim()}`);
    }

    return parts.join('\n');
  },

  formatConversationBlock(memory: FarmerMemorySnapshot, maxTurns = 10): string {
    const header = [
      `Known crop: ${memory.cropType} (do NOT ask which crop unless farmer clearly switched crops).`,
      memory.dap != null ? `Growth stage: ~${memory.dap} DAP.` : null,
      memory.lastAdvisorySummary
        ? `Last advice given: ${memory.lastAdvisorySummary.slice(0, 300)}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');

    const turns = memory.recentTurns.slice(-maxTurns).join('\n');
    const hints = memory.verifiedRegionalHints?.trim()
      ? `Expert-verified learnings for this crop/area:\n${memory.verifiedRegionalHints.trim()}`
      : null;
    return [header, hints, turns ? `Conversation:\n${turns}` : null].filter(Boolean).join('\n\n');
  },

  knowsCrop(memory: FarmerMemorySnapshot): boolean {
    return memory.knownCropLocked;
  },

  memoryAwareFallback(memory: FarmerMemorySnapshot, language: AdvisoryLanguage): string {
    const crop =
      memory.cropType.charAt(0).toUpperCase() + memory.cropType.slice(1).replace(/_/g, ' ');

    const map: Record<AdvisoryLanguage, string> = {
      en: memory.knownCropLocked
        ? `I'm here for your ${crop} crop. Send a clear photo of the problem area, or describe symptoms — I'll use what we already know about your field.`
        : `Tell me your crop and the problem (or send a photo), and I'll guide you step by step.`,
      ml: memory.knownCropLocked
        ? `നിങ്ങളുടെ ${crop} വിളയ്ക്ക് ഞാൻ സഹായിക്കാം. പ്രശ്നമുള്ള ഇലയുടെ ഫോട്ടോ അയയ്ക്കുക, അല്ലെങ്കിൽ ലക്ഷണം വിവരിക്കുക.`
        : `വിളയും പ്രശ്നവും പറയുക (അല്ലെങ്കിൽ ഫോട്ടോ അയയ്ക്കുക).`,
      ta: memory.knownCropLocked
        ? `உங்கள் ${crop} பயிருக்கு உதவுகிறேன். பிரச்சனை இலையின் புகைப்படம் அல்லது அறிகுறிகளை அனுப்புங்கள்.`
        : `பயிர் மற்றும் பிரச்சனையை சொல்லுங்கள் (அல்லது புகைப்படம் அனுப்புங்கள்).`,
      kn: memory.knownCropLocked
        ? `ನಿಮ್ಮ ${crop} ಬೆಳೆಗೆ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ಸಮಸ್ಯೆಯ ಫೋಟೋ ಅಥವಾ ಲಕ್ಷಣಗಳನ್ನು ಕಳುಹಿಸಿ.`
        : `ಬೆಳೆ ಮತ್ತು ಸಮಸ್ಯೆಯನ್ನು ಹೇಳಿ (ಅಥವಾ ಫೋಟೋ ಕಳುಹಿಸಿ).`,
      hi: memory.knownCropLocked
        ? `आपकी ${crop} फसल के लिए मैं यहाँ हूँ। समस्या वाली तस्वीर या लक्षण भेजें।`
        : `फसल और समस्या बताएँ (या फोटो भेजें).`,
    };
    return map[language] ?? map.en;
  },
};
