import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';

const OPENAI_BASE = 'https://api.openai.com/v1';
const SUPPORTED = ['ginger', 'banana', 'cardamom', 'pepper', 'other'] as const;
type SupportedCrop = (typeof SUPPORTED)[number];

function normalizeCrop(value: string): SupportedCrop | null {
  const v = value.trim().toLowerCase();
  if (v.includes('ginger')) return 'ginger';
  if (v.includes('banana')) return 'banana';
  if (v.includes('cardamom')) return 'cardamom';
  if (v.includes('pepper')) return 'pepper';
  if (v.includes('other')) return 'other';
  return null;
}

export const cropDetectionService = {
  async detectFromImage(params: {
    imageBase64: string;
    imageMimeType: string;
    caption?: string;
  }): Promise<{ crop: SupportedCrop | null; confidence: number }> {
    if (!env.OPENAI_API_KEY) return { crop: null, confidence: 0 };

    try {
      const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.OPENAI_VISION_MODEL,
          max_tokens: 120,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'Identify crop in this farm image. Return JSON: {"crop":"ginger|banana|cardamom|pepper|other","confidence":0..1}.',
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: `Caption/context: ${params.caption ?? '(none)'}` },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${params.imageMimeType};base64,${params.imageBase64}`,
                    detail: 'high',
                  },
                },
              ],
            },
          ],
        }),
      });
      if (!res.ok) return { crop: null, confidence: 0 };
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const text = data.choices?.[0]?.message?.content ?? '';
      const parsed = JSON.parse(text) as { crop?: string; confidence?: number };
      const crop = normalizeCrop(parsed.crop ?? '');
      const confidence = Math.max(0, Math.min(1, Number(parsed.confidence ?? 0)));
      return { crop, confidence };
    } catch (err) {
      logger.warn({ err }, 'Crop detection failed');
      return { crop: null, confidence: 0 };
    }
  },
};

