import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';
import type { AgricultureInputCategory } from './input-classifier.service.js';

export type VisionPrimaryCategory =
  | 'crop_leaf'
  | 'disease_symptom'
  | 'insect'
  | 'weed'
  | 'root'
  | 'soil'
  | 'fertilizer_bag'
  | 'pesticide_label'
  | 'unknown_plant'
  | 'other';

export type VisionClassification = {
  primaryCategory: VisionPrimaryCategory;
  confidence: number;
  photoQuality: 'ok' | 'blurry' | 'too_dark' | 'unknown';
  hints: string[];
};

const CATEGORY_MAP: Record<VisionPrimaryCategory, AgricultureInputCategory> = {
  crop_leaf: 'disease_stress',
  disease_symptom: 'disease_stress',
  insect: 'insect',
  weed: 'weed',
  root: 'root_soil',
  soil: 'root_soil',
  fertilizer_bag: 'cultivation',
  pesticide_label: 'compatibility',
  unknown_plant: 'unknown_low_conf',
  other: 'unknown_low_conf',
};

function parseVisionJson(text: string): VisionClassification | null {
  try {
    const parsed = JSON.parse(text) as {
      primary_category?: string;
      confidence?: number;
      photo_quality?: string;
      hints?: string[];
    };
    const raw = (parsed.primary_category ?? 'other').toLowerCase().replace(/\s+/g, '_');
    const allowed: VisionPrimaryCategory[] = [
      'crop_leaf',
      'disease_symptom',
      'insect',
      'weed',
      'root',
      'soil',
      'fertilizer_bag',
      'pesticide_label',
      'unknown_plant',
      'other',
    ];
    const primaryCategory = (allowed.includes(raw as VisionPrimaryCategory)
      ? raw
      : 'other') as VisionPrimaryCategory;
    const pq = (parsed.photo_quality ?? 'ok').toLowerCase();
    const photoQuality =
      pq === 'blurry' || pq === 'too_dark' || pq === 'ok' ? pq : 'unknown';
    return {
      primaryCategory,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.5))),
      photoQuality,
      hints: Array.isArray(parsed.hints) ? parsed.hints.map(String).slice(0, 5) : [],
    };
  } catch {
    return null;
  }
}

export const imageInputClassifierService = {
  toAgricultureCategory(vision: VisionClassification): AgricultureInputCategory {
    return CATEGORY_MAP[vision.primaryCategory] ?? 'unknown_low_conf';
  },

  async classifyImage(params: {
    imageBase64: string;
    imageMimeType: string;
    caption?: string;
  }): Promise<VisionClassification | null> {
    if (!env.OPENAI_API_KEY) return null;

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.OPENAI_VISION_MODEL,
          max_tokens: 280,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'You classify farm WhatsApp images for routing. Return JSON only: {"primary_category":"crop_leaf|disease_symptom|insect|weed|root|soil|fertilizer_bag|pesticide_label|unknown_plant|other","confidence":0-1,"photo_quality":"ok|blurry|too_dark","hints":["short hint"]}. Use disease_symptom for leaf spots, wilt, fungal lesions. Use insect for thrips/mite damage patterns (silvery streaks, scraping on leaves) even if pests are not visible. photo_quality=ok unless truly unusable.',
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: `Farmer caption: ${params.caption ?? '(none)'}` },
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
      if (!res.ok) return null;
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const text = data.choices?.[0]?.message?.content ?? '';
      return parseVisionJson(text);
    } catch (err) {
      logger.warn({ err }, 'Vision input classification failed');
      return null;
    }
  },
};
