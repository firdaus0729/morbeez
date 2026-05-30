import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';
import { openaiTokenLimitBody } from '../../ai/providers/openai-chat-params.js';
import type { AdvisoryLanguage, StructuredAdvisory } from '../../ai/types.js';
import {
  compatibilityLookupService,
  type CompatibilityLookupResult,
} from './compatibility-lookup.service.js';
import type { FarmerMemorySnapshot } from './farmer-memory.service.js';
import { farmerMemoryService } from './farmer-memory.service.js';
import { responseComposerService } from './response-composer.service.js';

const OPENAI_BASE = 'https://api.openai.com/v1';

export type PolishTask = 'compatibility' | 'diagnosis' | 'agronomy';

function systemPrompt(task: PolishTask): string {
  const base = `You rewrite Morbeez WhatsApp messages for Indian farmers.
CRITICAL: You are NOT allowed to change verified facts. Never invent products, doses, diseases, or mix compatibility.
- If draft says DO NOT MIX / not compatible / incompatible → keep that meaning exactly.
- If draft says compatible → keep that meaning exactly.
- Keep all product names, numbers, rates, and hours unchanged.
- Reply in the farmer's language. Max 550 characters for the main body.
- Sound like a caring agronomist texting — warm, direct, no "Welcome to Morbeez", no menus.
- One short follow-up question only if the draft already had one.`;

  if (task === 'diagnosis') {
    return `${base}
- Keep the probable issue / pest / disease name exactly as given.
- Keep every product and rate from the draft; you may reorder sentences for clarity only.`;
  }
  return base;
}

function buildCompatibilityLockedFacts(
  lookup: CompatibilityLookupResult,
  pair: { productA: string; productB: string }
): string {
  const a = lookup.productA ?? pair.productA;
  const b = lookup.productB ?? pair.productB;
  const verdict =
    lookup.compatible === true
      ? 'COMPATIBLE (same tank allowed per verified chart/DB)'
      : lookup.compatible === false
        ? 'NOT COMPATIBLE (do not mix in same tank per verified chart/DB)'
        : 'UNKNOWN';
  const lines = [`Products: ${a} + ${b}`, `Verdict: ${verdict}`];
  if (lookup.minIntervalHours != null && lookup.compatible === false) {
    lines.push(`Minimum gap if alternating: ${lookup.minIntervalHours} hours`);
  }
  if (lookup.notes?.trim()) lines.push(`Notes: ${lookup.notes.trim()}`);
  return lines.join('\n');
}

export function buildDiagnosisLockedFacts(advisory: StructuredAdvisory): string {
  const lines = [
    `Probable issue: ${advisory.probableIssue}`,
    `Confidence: ${Math.round(advisory.confidence * 100)}%`,
  ];
  if (advisory.uncertain) lines.push('Status: uncertain — advise caution');
  for (const d of advisory.dosageGuidance ?? []) {
    lines.push(`Product/dose: ${d.product} — ${d.rate} — ${d.method}`);
  }
  for (const p of advisory.precautions ?? []) {
    lines.push(`Precaution: ${p}`);
  }
  return lines.join('\n');
}

export const farmerReplyPolishService = {
  isEnabled(): boolean {
    return (
      env.ENABLE_WHATSAPP_REPLY_POLISH &&
      Boolean(env.OPENAI_API_KEY?.trim())
    );
  },

  async polish(params: {
    factualDraft: string;
    language: AdvisoryLanguage;
    task: PolishTask;
    memory?: FarmerMemorySnapshot;
    lockedFacts: string;
    footer?: string | null;
  }): Promise<string> {
    if (!this.isEnabled()) return params.factualDraft;

    const memoryBlock = params.memory
      ? farmerMemoryService.formatConversationBlock(params.memory, 8)
      : '';
    const hints = params.memory?.verifiedRegionalHints?.trim();

    const userPrompt = `Language: ${params.language}
Task: ${params.task}

LOCKED FACTS (must all remain true in your reply):
${params.lockedFacts}
${hints ? `\nRegional learnings (may reference briefly if relevant, do not contradict locked facts):\n${hints}` : ''}
${memoryBlock ? `\nFarmer context:\n${memoryBlock}` : ''}

Draft message to rewrite (preserve all facts):
${params.factualDraft.trim()}

Write the final WhatsApp message body only (no JSON).`;

    try {
      const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.OPENAI_TEXT_MODEL,
          ...openaiTokenLimitBody(env.OPENAI_TEXT_MODEL, 450),
          temperature: 0.35,
          messages: [
            { role: 'system', content: systemPrompt(params.task) },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!res.ok) {
        logger.warn({ status: res.status }, 'Reply polish failed, using draft');
        return params.factualDraft;
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      let body = data.choices?.[0]?.message?.content?.trim();
      if (!body) return params.factualDraft;

      body = body.slice(0, 1100);
      if (params.footer?.trim()) {
        return responseComposerService.compose({
          body,
          footer: params.footer,
        });
      }
      return body;
    } catch (err) {
      logger.warn({ err }, 'Reply polish error, using draft');
      return params.factualDraft;
    }
  },

  async polishCompatibilityReply(params: {
    lookup: CompatibilityLookupResult;
    pair: { productA: string; productB: string };
    language: AdvisoryLanguage;
    memory?: FarmerMemorySnapshot;
  }): Promise<string> {
    const draft = compatibilityLookupService.formatFarmerReply(
      params.lookup,
      params.language,
      params.pair
    );

    return this.polish({
      factualDraft: draft,
      language: params.language,
      task: 'compatibility',
      memory: params.memory,
      lockedFacts: buildCompatibilityLockedFacts(params.lookup, params.pair),
    });
  },

  async polishDiagnosisSummary(params: {
    advisory: StructuredAdvisory;
    language: AdvisoryLanguage;
    memory: FarmerMemorySnapshot;
    extraLines?: string[];
  }): Promise<string> {
    const summary =
      params.language === 'ml' && params.advisory.farmerSummaryMl
        ? params.advisory.farmerSummaryMl
        : params.advisory.farmerSummaryEn;
    if (!summary?.trim()) return summary ?? '';

    let draft = summary.trim();
    if (params.extraLines?.length) {
      draft = `${draft}\n\n${params.extraLines.join('\n')}`;
    }

    return this.polish({
      factualDraft: draft,
      language: params.language,
      task: 'diagnosis',
      memory: params.memory,
      lockedFacts: buildDiagnosisLockedFacts(params.advisory),
    });
  },
};
