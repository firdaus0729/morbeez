import type { AdvisoryLanguage } from '../../ai/types.js';
import { whatsappConversationalService } from '../whatsapp-conversational.service.js';
import { aiUsageControlService } from './ai-usage-control.service.js';
import { isExplicitAgronomyQuestion } from './agriculture-free-text.service.js';
import {
  compatibilityLookupService,
  parseProductPairFromText,
} from './compatibility-lookup.service.js';
import { farmerMemoryService } from './farmer-memory.service.js';
import { farmerReplyPolishService } from './farmer-reply-polish.service.js';

/**
 * Agronomy-first reply: verified tank-mix DB → conversational AI with farmer memory.
 * Returns true when a reply was sent.
 */
export async function tryAgronomyReply(params: {
  farmerId: string;
  phone: string;
  language: AdvisoryLanguage;
  text: string;
  sendText: (phone: string, text: string) => Promise<void>;
  farmerName?: string;
  isPremium?: boolean;
}): Promise<boolean> {
  const text = params.text.trim();
  if (!text) return false;

  const isAgronomy = isExplicitAgronomyQuestion(text);
  const pair = parseProductPairFromText(text);
  if (!isAgronomy && !pair) return false;

  const memory = await farmerMemoryService.build(params.farmerId, { symptomsText: text });

  if (pair) {
    const lookup = await compatibilityLookupService.lookup(pair.productA, pair.productB);
    if (lookup.found) {
      const reply = farmerReplyPolishService.isEnabled()
        ? await farmerReplyPolishService.polishCompatibilityReply({
            lookup,
            pair,
            language: params.language,
            memory,
          })
        : compatibilityLookupService.formatFarmerReply(lookup, params.language, pair);
      await params.sendText(params.phone, reply);
      return true;
    }
  }

  if (whatsappConversationalService.isEnabled()) {
    const usage = await aiUsageControlService.checkAndConsume({
      farmerId: params.farmerId,
      kind: 'text',
      isPremium: params.isPremium ?? false,
    });
    if (!usage.allowed) {
      await params.sendText(
        params.phone,
        aiUsageControlService.usageLimitMessage(params.language, usage.reason)
      );
      return true;
    }
  }

  if (!whatsappConversationalService.isEnabled()) {
    if (pair) {
      await params.sendText(
        params.phone,
        compatibilityLookupService.formatFarmerReply(
          { found: false, productA: pair.productA, productB: pair.productB },
          params.language,
          pair
        )
      );
      return true;
    }
    return false;
  }

  const reply = await whatsappConversationalService.generateReply({
    userMessage: text,
    language: params.language,
    farmerName: params.farmerName,
    memory,
  });
  await params.sendText(params.phone, reply);
  return true;
}
