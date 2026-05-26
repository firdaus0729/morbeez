import { env } from '../config/env.js';
import { supabase } from '../lib/supabase.js';
export async function healthRoutes(app) {
    app.get('/health', async () => ({
        status: 'ok',
        service: 'morbeez-api',
        timestamp: new Date().toISOString(),
    }));
    /** Debug Meta webhook setup on Render (does not expose secrets). */
    app.get('/health/whatsapp-meta', async () => ({
        provider: env.WHATSAPP_PROVIDER,
        verifyTokenConfigured: Boolean(env.WHATSAPP_VERIFY_TOKEN?.trim()),
        phoneNumberIdConfigured: Boolean(env.WHATSAPP_PHONE_NUMBER_ID?.trim()),
        accessTokenConfigured: Boolean(env.WHATSAPP_ACCESS_TOKEN?.trim()),
        appSecretConfigured: Boolean(env.WHATSAPP_APP_SECRET?.trim()),
        callbackPath: '/webhooks/whatsapp',
    }));
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