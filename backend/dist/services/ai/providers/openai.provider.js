import { env } from '../../../config/env.js';
import { AppError } from '../../../lib/errors.js';
import { logger } from '../../../lib/logger.js';
import { openaiTokenLimitBody } from './openai-chat-params.js';
const OPENAI_BASE = 'https://api.openai.com/v1';
async function openaiFetch(path, init) {
    if (!env.OPENAI_API_KEY) {
        throw new AppError('OpenAI not configured', 503, 'OPENAI_NOT_CONFIGURED');
    }
    return fetch(`${OPENAI_BASE}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            ...init.headers,
        },
    });
}
function parseStructuredJson(content) {
    const trimmed = content.trim();
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new AppError('Invalid AI response format', 502, 'AI_PARSE_ERROR');
    }
    const parsed = JSON.parse(jsonMatch[0]);
    parsed.confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5));
    parsed.uncertain = Boolean(parsed.uncertain);
    parsed.escalationRecommended = Boolean(parsed.escalationRecommended);
    return parsed;
}
export const openaiVisionProvider = {
    name: 'openai',
    async analyzeVision(input) {
        const model = env.OPENAI_VISION_MODEL;
        const body = {
            model,
            ...openaiTokenLimitBody(model, 2048),
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: input.systemPrompt },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: input.userPrompt },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:${input.mimeType};base64,${input.imageBase64}`,
                                detail: 'high',
                            },
                        },
                    ],
                },
            ],
        };
        const started = Date.now();
        const res = await openaiFetch('/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const text = await res.text();
            logger.error({ status: res.status, text }, 'OpenAI vision failed');
            throw new AppError('Vision analysis failed', res.status, 'OPENAI_VISION_FAILED', text);
        }
        const data = (await res.json());
        const content = data.choices?.[0]?.message?.content ?? '';
        logger.debug({ latencyMs: Date.now() - started, tokens: data.usage?.total_tokens }, 'OpenAI vision ok');
        return parseStructuredJson(content);
    },
};
export const openaiWhisperProvider = {
    name: 'openai-whisper',
    async transcribe(input) {
        const form = new FormData();
        const blob = new Blob([new Uint8Array(input.audioBuffer)], { type: input.mimeType });
        form.append('file', blob, 'voice.ogg');
        form.append('model', env.OPENAI_WHISPER_MODEL);
        if (input.languageHint)
            form.append('language', input.languageHint);
        const res = await openaiFetch('/audio/transcriptions', {
            method: 'POST',
            body: form,
        });
        if (!res.ok) {
            const text = await res.text();
            throw new AppError('Transcription failed', res.status, 'WHISPER_FAILED', text);
        }
        const data = (await res.json());
        return data.text?.trim() ?? '';
    },
};
/** Text-only advisory when no image */
export async function openaiTextAdvisory(systemPrompt, userPrompt) {
    const res = await openaiFetch('/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: env.OPENAI_TEXT_MODEL,
            ...openaiTokenLimitBody(env.OPENAI_TEXT_MODEL, 2048),
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
        }),
    });
    if (!res.ok) {
        throw new AppError('Text advisory failed', res.status, 'OPENAI_TEXT_FAILED', await res.text());
    }
    const data = (await res.json());
    return parseStructuredJson(data.choices?.[0]?.message?.content ?? '{}');
}
//# sourceMappingURL=openai.provider.js.map