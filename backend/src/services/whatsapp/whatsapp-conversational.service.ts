import { env } from '../../config/env.js';
import { openaiTokenLimitBody } from '../ai/providers/openai-chat-params.js';
import {
  logOpenAiQuotaInsufficient,
  parseOpenAiHttpError,
} from '../ai/openai-quota.service.js';
import { logger } from '../../lib/logger.js';
import type { AdvisoryLanguage } from '../ai/types.js';
import { knowledgeFallbackService } from './pipeline/knowledge-fallback.service.js';
import type { FarmerMemorySnapshot } from './pipeline/farmer-memory.service.js';
import { farmerMemoryService } from './pipeline/farmer-memory.service.js';

const OPENAI_BASE = 'https://api.openai.com/v1';

const SYSTEM_PROMPT = `You are Morbeez Crop Doctor on WhatsApp — a helpful agriculture assistant for Indian farmers.

Rules:
- Reply in the same language the farmer uses (English, Malayalam, Hindi, Tamil, Kannada as detected).
- Keep replies under 600 characters, friendly and practical — like a field agronomist texting, not a corporate bot.
- Never open with "Welcome to Morbeez" or generic menus when the farmer asked a specific farming question.
- Use the farmer memory block: if crop is already known, do NOT ask "what crop?" — answer in context of that crop.
- Morbeez sells bio fertilizers, bio pesticides, and crop advisory.
- Morbeez Calcium Nitrate chart: compatible with urea, potassium nitrate, boron (Solubor), amino acids, protein hydrolysate, light seaweed (low dose), fulvic acid (low dose), EDTA chelates. NOT compatible with MAP, MKP, DAP, phosphoric/phosphite/phosphonic acids, magnesium sulphate, ammonium sulphate, SOP, Zn/Fe/Mn sulphates, humic flakes, lime/bicarbonates, oil pesticides. Never mix Ca nitrate + MgSO₄ + MKP/phosphonic in one tank (precipitation/clogging).
- For crop disease on photos: ask for a clear photo if none sent; do not give vague deflection.
- For orders, prices, or dealer enquiries: tell them to type "quote" or visit the Morbeez website.
- For urgent human help: tell them to type "call".
- Do not claim guaranteed cures. Say advice is AI-assisted with agronomist support when needed.
- Never discuss crypto, politics, or non-agriculture topics — politely redirect to farming.
- Converse naturally; one short follow-up question at most.`;

async function fallbackWithoutOpenAi(params: {
  farmerId: string;
  userMessage: string;
  language: AdvisoryLanguage;
  memory?: FarmerMemorySnapshot;
  followUp?: boolean;
}): Promise<string> {
  const memory =
    params.memory ??
    (await farmerMemoryService.build(params.farmerId, { symptomsText: params.userMessage }));

  const knowledge = await knowledgeFallbackService.tryReply({
    farmerId: params.farmerId,
    text: params.userMessage,
    language: params.language,
    memory,
    followUp: params.followUp,
  });
  if (knowledge) return knowledge;
  return farmerMemoryService.memoryAwareFallback(memory, params.language);
}

/**
 * Lightweight OpenAI chat reply for WhatsApp (greetings, general chat).
 * Full crop diagnosis still uses cropDoctorService when symptoms/media warrant it.
 */
export const whatsappConversationalService = {
  isEnabled(): boolean {
    return (
      env.ENABLE_WHATSAPP_OPENAI_REPLY &&
      Boolean(env.OPENAI_API_KEY?.trim())
    );
  },

  async generateReply(params: {
    farmerId: string;
    userMessage: string;
    language: AdvisoryLanguage;
    farmerName?: string;
    /** @deprecated use memory */
    conversationHistory?: string[];
    memory?: FarmerMemorySnapshot;
    /** Farmer is asking to deepen the previous assistant message — never reset to welcome */
    followUp?: boolean;
  }): Promise<string> {
    if (!env.OPENAI_API_KEY) {
      return fallbackWithoutOpenAi(params);
    }

    const name = params.farmerName?.split(' ')[0] ?? 'Farmer';
    const memoryBlock = params.memory
      ? farmerMemoryService.formatConversationBlock(params.memory, 10)
      : (params.conversationHistory ?? []).slice(-10).join('\n') || '(none)';

    const userPrompt = `Farmer name: ${name}
Language hint: ${params.language}

Farmer memory (trust this — do not contradict without reason):
${memoryBlock}

Farmer message: ${params.userMessage.trim() || '(empty)'}
${
  params.followUp
    ? `
IMPORTANT: This is a FOLLOW-UP. The farmer wants MORE DETAIL on your previous advice (mix, drench, disease, etc.).
- Expand step-by-step: what each product does, order of mixing, what NOT to combine, jar test, timing.
- Reference the last Assistant message in the conversation log.
- Do NOT say welcome, do NOT ask which crop if crop is already known in memory.
- Be specific and practical for their ginger/field context.`
    : ''
}

Write a helpful WhatsApp reply.`;

    try {
      const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.OPENAI_TEXT_MODEL,
          ...openaiTokenLimitBody(env.OPENAI_TEXT_MODEL, 500),
          temperature: 0.65,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        const quota = parseOpenAiHttpError(res.status, errText);
        if (quota.isQuotaIssue) {
          logOpenAiQuotaInsufficient('whatsapp-conversational', quota, {
            farmerId: params.farmerId,
          });
        } else {
          logger.error({ status: res.status, errText }, 'WhatsApp OpenAI chat failed');
        }
        return fallbackWithoutOpenAi(params);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) return fallbackWithoutOpenAi(params);
      return text.slice(0, 3500);
    } catch (err) {
      logger.error({ err, farmerId: params.farmerId }, 'WhatsApp OpenAI chat error');
      return fallbackWithoutOpenAi(params);
    }
  },
};
