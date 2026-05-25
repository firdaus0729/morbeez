import { supabase } from '../lib/supabase.js';
export async function healthRoutes(app) {
    app.get('/health', async () => ({
        status: 'ok',
        service: 'morbeez-api',
        timestamp: new Date().toISOString(),
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