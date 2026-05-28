import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
const OPENAI_BASE = 'https://api.openai.com/v1';
const SYSTEM_PROMPT = `You are Morbeez Crop Doctor on WhatsApp — a helpful agriculture assistant for Indian farmers.

Rules:
- Reply in the same language the farmer uses (English, Malayalam, Hindi, Tamil, Kannada as detected).
- Keep replies under 600 characters, friendly and practical.
- Morbeez sells bio fertilizers, bio pesticides, and crop advisory.
- For crop problems: ask for a clear photo of affected leaves/plants and the crop name (e.g. ginger, pepper).
- For orders, prices, or dealer enquiries: tell them to type "quote" or visit the Morbeez website.
- For urgent human help: tell them to type "call".
- Do not claim guaranteed cures. Say advice is AI-assisted with agronomist support when needed.
- Never discuss crypto, politics, or non-agriculture topics — politely redirect to farming.
- Converse naturally like a caring agronomy expert, not a rigid bot.
- Use prior conversation context to avoid repeating the same questions.
- If crop is unclear, ask one short clarifying question before advising.
- Avoid making crop assumptions that conflict with user's latest message.`;
/**
 * Lightweight OpenAI chat reply for WhatsApp (greetings, general questions).
 * Full crop diagnosis still uses cropDoctorService when symptoms/media warrant it.
 */
export const whatsappConversationalService = {
    isEnabled() {
        return (env.ENABLE_WHATSAPP_OPENAI_REPLY &&
            Boolean(env.OPENAI_API_KEY?.trim()));
    },
    async generateReply(params) {
        if (!env.OPENAI_API_KEY) {
            return defaultFallback(params.language);
        }
        const name = params.farmerName?.split(' ')[0] ?? 'Farmer';
        const historyBlock = (params.conversationHistory ?? []).slice(-10).join('\n');
        const userPrompt = `Farmer name: ${name}
Language hint: ${params.language}
Recent conversation:
${historyBlock || '(none)'}

Farmer message: ${params.userMessage.trim() || '(empty)'}

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
                    max_tokens: 400,
                    temperature: 0.6,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: userPrompt },
                    ],
                }),
            });
            if (!res.ok) {
                const errText = await res.text();
                logger.error({ status: res.status, errText }, 'WhatsApp OpenAI chat failed');
                return defaultFallback(params.language);
            }
            const data = (await res.json());
            const text = data.choices?.[0]?.message?.content?.trim();
            if (!text)
                return defaultFallback(params.language);
            return text.slice(0, 3500);
        }
        catch (err) {
            logger.error({ err }, 'WhatsApp OpenAI chat error');
            return defaultFallback(params.language);
        }
    },
};
function defaultFallback(language) {
    const messages = {
        en: `Hello! Welcome to Morbeez Crop Doctor 🌱

Send a crop photo or describe your problem (crop name + symptoms), and I'll guide you.

Type *quote* for product prices or *call* to speak with our team.`,
        ml: `നമസ്കാരം! മോർബീസ് ക്രോപ്പ് ഡോക്ടറിലേക്ക് സ്വാഗതം 🌱

വിളയുടെ ഫോട്ടോ അയയ്ക്കുക, അല്ലെങ്കിൽ പ്രശ്നം വിവരിക്കുക.

വിലയ്ക്ക് *quote* ടൈപ്പ് ചെയ്യുക.`,
    };
    return messages[language] ?? messages.en;
}
//# sourceMappingURL=whatsapp-conversational.service.js.map