import type { DosageItem, StructuredAdvisory } from '../../ai/types.js';
import type { AdvisoryLanguage } from '../../ai/types.js';
import { conversationSessionService } from '../conversation-session.service.js';
import { dosageCalculatorService } from './dosage-calculator.service.js';
import { t } from './whatsapp-flow-copy.js';
export const diagnosisFlowService = {
  async recordImageReceived(farmerId: string): Promise<{ imageCount: number; shouldRunDiagnosis: boolean }> {
    const ctx = await conversationSessionService.getContext(farmerId);
    const prev = ctx.diagnosis?.imageCount ?? 0;
    const imageCount = prev + 1;
    await conversationSessionService.patchContext(farmerId, {
      diagnosis: { ...ctx.diagnosis, imageCount },
    });
    return { imageCount, shouldRunDiagnosis: imageCount >= 2 };
  },

  firstImagePrompt(language: AdvisoryLanguage): string {
    return t('imageReceived', language);
  },

  analyzingPrompt(language: AdvisoryLanguage): string {
    return t('sendMorePhotos', language);
  },

  async storeDiagnosisResult(
    farmerId: string,
    sessionId: string,
    advisory: StructuredAdvisory,
    summary: string
  ): Promise<void> {
    const ctx = await conversationSessionService.getContext(farmerId);
    const dosageItems: DosageItem[] = advisory.dosageGuidance ?? [];
    await conversationSessionService.patchContext(farmerId, {
      diagnosis: {
        ...ctx.diagnosis,
        lastSessionId: sessionId,
        lastAdvisorySummary: summary.slice(0, 800),
        dosageItems,
        imageCount: ctx.diagnosis?.imageCount ?? 1,
      },
    });
    if (dosageItems.length > 0) {
      await conversationSessionService.setState(farmerId, 'diagnosis_water_volume');
    } else if (advisory.escalationRecommended || advisory.confidence < 0.55) {
      await conversationSessionService.setState(farmerId, 'root_photos_requested');
    } else {
      await conversationSessionService.setState(farmerId, 'main_menu');
    }
  },

  waterVolumeList(language: AdvisoryLanguage) {
    return {
      body: t('waterVolumePrompt', language),
      buttonText: language === 'ml' ? 'തിരഞ്ഞെടുക്കുക' : 'Choose',
      sections: [
        {
          title: 'Water',
          rows: [
            { id: 'water.200', title: '200L', description: 'Standard tank' },
            { id: 'water.400', title: '400L', description: 'Large tank' },
            { id: 'water.custom', title: 'Custom', description: 'Type liters' },
            { id: 'action.callback', title: 'Callback', description: 'Talk to team' },
          ],
        },
      ],
    };
  },

  async formatQuantityReply(
    farmerId: string,
    language: AdvisoryLanguage,
    waterLiters: number
  ): Promise<string> {
    const ctx = await conversationSessionService.getContext(farmerId);
    const items = ctx.diagnosis?.dosageItems ?? [];
    if (!items.length) {
      return `${t('quantityResult', language)}\n\nNo dosage data from last diagnosis.`;
    }

    const calculated = await dosageCalculatorService.calculateForWaterVolume(items, waterLiters);
    const lines = [t('quantityResult', language), ''];
    for (const c of calculated) {
      lines.push(
        `• ${c.product} → ${c.assignedKg}kg` +
          (c.requiredKg !== c.assignedKg ? ` (needed ~${c.requiredKg}kg, rounded up)` : '') +
          `\n  Packs: ${c.packLine}`
      );
    }
    lines.push('\nReply *Buy* for shop link, *Technical* for names only, or *Callback*.');
    return lines.join('\n');
  },

  technicalOnlyReply(advisory: StructuredAdvisory, language: AdvisoryLanguage): string {
    const lines = [t('technicalOnly', language), ''];
    for (const d of advisory.dosageGuidance ?? []) {
      lines.push(`• ${d.product}\n  ${d.rate}\n  ${d.method}`);
    }
    return lines.join('\n');
  },

  productUnavailableReply(language: AdvisoryLanguage): string {
    return t('productUnavailable', language);
  },

  lowConfidenceReply(language: AdvisoryLanguage): string {
    return t('lowConfidence', language);
  },

  rootPhotosReply(language: AdvisoryLanguage): string {
    return t('rootPhotosNeeded', language);
  },

  duplicateImageReply(language: AdvisoryLanguage, previousSummary?: string): string {
    const base = t('duplicateImage', language);
    if (previousSummary) return `${base}\n\nPrevious:\n${previousSummary.slice(0, 500)}`;
    return base;
  },

  parseWaterLiters(text: string): number | null {
    if (text === 'water.200') return 200;
    if (text === 'water.400') return 400;
    const m = text.match(/(\d{2,4})\s*l/i) ?? text.match(/^(\d{2,4})$/);
    if (m) {
      const n = Number(m[1]);
      if (n >= 50 && n <= 5000) return n;
    }
    return null;
  },
};
