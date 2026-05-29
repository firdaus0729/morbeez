import type { AdvisoryLanguage } from '../../ai/types.js';

const DEFAULT_MAX_CHARS = 1200;
const MAX_PARAGRAPHS = 4;

export type ComposeFarmerReplyInput = {
  body: string;
  validationQuestion?: string | null;
  footer?: string | null;
  maxChars?: number;
};

/** Farmer-facing WhatsApp copy: short blocks, optional single validation question. */
export const responseComposerService = {
  compose(input: ComposeFarmerReplyInput): string {
    const maxChars = input.maxChars ?? DEFAULT_MAX_CHARS;
    let body = normalizeWhitespace(input.body.trim());
    body = truncateParagraphs(body, MAX_PARAGRAPHS);
    body = hardTruncate(body, maxChars - 200);

    const parts: string[] = [body];

    const q = input.validationQuestion?.trim();
    if (q) {
      const question = q.endsWith('?') ? q : `${q}?`;
      parts.push(question);
    }

    const footer = input.footer?.trim();
    if (footer) parts.push(footer);

    return hardTruncate(parts.join('\n\n'), maxChars);
  },

  /** Pull first sentence ending with ? from text if no explicit question provided. */
  extractValidationQuestion(text: string): string | null {
    const lines = text.split(/\n+/);
    for (const line of lines) {
      const t = line.trim();
      if (t.includes('?') && t.length < 180) {
        const idx = t.indexOf('?');
        return t.slice(0, idx + 1).trim();
      }
    }
    return null;
  },

  advisoryDisclaimer(language: AdvisoryLanguage): string {
    const map: Record<AdvisoryLanguage, string> = {
      en: '— Morbeez AI-assisted advisory (possible issue, not a guaranteed diagnosis).',
      ml: '— മോർബീസ് AI സഹായം (സാധ്യതയുള്ള പ്രശ്നം, ഉറപ്പായ രോഗനിർണയമല്ല).',
      ta: '— Morbeez AI உதவி (சாத்தியமான பிரச்சனை, உறுதியான நோய் கண்டறிதல் அல்ல).',
      kn: '— Morbeez AI ಸಹಾಯ (ಸಾಧ್ಯತೆಯ ಸಮಸ್ಯೆ, ಖಚಿತ ರೋಗನಿರ್ಣಯ ಅಲ್ಲ).',
      hi: '— Morbeez AI सहायता (संभावित समस्या, पक्का निदान नहीं).',
    };
    return map[language] ?? map.en;
  },
};

function normalizeWhitespace(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
}

function truncateParagraphs(text: string, maxParagraphs: number): string {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  if (paragraphs.length <= maxParagraphs) return paragraphs.join('\n\n');
  return paragraphs.slice(0, maxParagraphs).join('\n\n');
}

function hardTruncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}
