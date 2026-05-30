import { env } from '../../../config/env.js';
import { openaiTokenLimitBody } from '../../ai/providers/openai-chat-params.js';
import { logger } from '../../../lib/logger.js';
const CATEGORY_MAP = {
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
function parseVisionJson(text) {
    try {
        const parsed = JSON.parse(text);
        const raw = (parsed.primary_category ?? 'other').toLowerCase().replace(/\s+/g, '_');
        const allowed = [
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
        const primaryCategory = (allowed.includes(raw)
            ? raw
            : 'other');
        const pq = (parsed.photo_quality ?? 'ok').toLowerCase();
        const photoQuality = pq === 'blurry' || pq === 'too_dark' || pq === 'ok' ? pq : 'unknown';
        return {
            primaryCategory,
            confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.5))),
            photoQuality,
            hints: Array.isArray(parsed.hints) ? parsed.hints.map(String).slice(0, 5) : [],
        };
    }
    catch {
        return null;
    }
}
export const imageInputClassifierService = {
    toAgricultureCategory(vision) {
        return CATEGORY_MAP[vision.primaryCategory] ?? 'unknown_low_conf';
    },
    async classifyImage(params) {
        if (!env.OPENAI_API_KEY)
            return null;
        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: env.OPENAI_VISION_MODEL,
                    ...openaiTokenLimitBody(env.OPENAI_VISION_MODEL, 280),
                    temperature: 0.1,
                    response_format: { type: 'json_object' },
                    messages: [
                        {
                            role: 'system',
                            content: 'You classify farm WhatsApp images for routing. Return JSON only: {"primary_category":"crop_leaf|disease_symptom|insect|weed|root|soil|fertilizer_bag|pesticide_label|unknown_plant|other","confidence":0-1,"photo_quality":"ok|blurry|too_dark","hints":["short hint"]}. Use disease_symptom for leaf spots, wilt, fungal lesions. Use insect for thrips/mite damage patterns (silvery streaks, scraping on leaves) even if pests are not visible. photo_quality=ok unless truly unusable.',
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
            if (!res.ok)
                return null;
            const data = (await res.json());
            const text = data.choices?.[0]?.message?.content ?? '';
            return parseVisionJson(text);
        }
        catch (err) {
            logger.warn({ err }, 'Vision input classification failed');
            return null;
        }
    },
};
//# sourceMappingURL=image-input-classifier.service.js.map