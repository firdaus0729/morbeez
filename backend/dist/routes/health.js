import { env } from '../config/env.js';
import { supabase } from '../lib/supabase.js';
export async function healthRoutes(app) {
    app.get('/health', async () => ({
        status: 'ok',
        service: 'morbeez-api',
        timestamp: new Date().toISOString(),
    }));
    /** Debug Meta webhook setup on Render (does not expose secrets). */
    app.get('/health/whatsapp-meta', async (_req, reply) => {
        const base = {
            provider: env.WHATSAPP_PROVIDER,
            verifyTokenConfigured: Boolean(env.WHATSAPP_VERIFY_TOKEN?.trim()),
            phoneNumberIdConfigured: Boolean(env.WHATSAPP_PHONE_NUMBER_ID?.trim()),
            accessTokenConfigured: Boolean(env.WHATSAPP_ACCESS_TOKEN?.trim()),
            appSecretConfigured: Boolean(env.WHATSAPP_APP_SECRET?.trim()),
            openaiConfigured: Boolean(env.OPENAI_API_KEY?.trim()),
            enableOpenaiReply: env.ENABLE_WHATSAPP_OPENAI_REPLY,
            enableCropDoctor: env.ENABLE_AI_CROP_DOCTOR,
            callbackUrl: `${(env.API_BASE_URL ?? '').replace(/\/$/, '') || 'https://morbeez-api.onrender.com'}/webhooks/whatsapp`,
            callbackPath: '/webhooks/whatsapp',
        };
        if (env.WHATSAPP_PROVIDER === 'cloud' &&
            env.WHATSAPP_PHONE_NUMBER_ID &&
            env.WHATSAPP_ACCESS_TOKEN) {
            try {
                const res = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}?fields=display_phone_number,verified_name`, { headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` } });
                const data = (await res.json());
                if (data.error) {
                    return reply.send({
                        ...base,
                        metaTokenValid: false,
                        metaError: data.error.message,
                    });
                }
                return reply.send({
                    ...base,
                    metaTokenValid: true,
                    displayPhoneNumber: data.display_phone_number,
                    verifiedName: data.verified_name,
                });
            }
            catch (err) {
                return reply.send({ ...base, metaTokenValid: false, metaError: String(err) });
            }
        }
        return reply.send(base);
    });
    app.get('/health/db', async (_req, reply) => {
        const { error } = await supabase.from('farmers').select('id').limit(1);
        if (error) {
            return reply.code(503).send({
                status: 'error',
                database: 'farmers',
                hint: error.message?.includes('row-level security') || error.code === '42501'
                    ? 'SUPABASE_SERVICE_ROLE_KEY is wrong (use service_role secret, not anon)'
                    : error.message,
            });
        }
        return { status: 'ok', database: 'farmers' };
    });
}
//# sourceMappingURL=health.js.map