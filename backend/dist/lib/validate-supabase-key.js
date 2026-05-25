/** Ensure service role key is not the anon key (common misconfiguration). */
export function assertSupabaseServiceRoleKey(key) {
    try {
        const part = key.split('.')[1];
        if (!part)
            throw new Error('invalid JWT');
        const payload = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
        if (payload.role !== 'service_role') {
            throw new Error(`SUPABASE_SERVICE_ROLE_KEY has role "${payload.role}" — use the service_role secret from Supabase Dashboard → Settings → API`);
        }
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : 'invalid key';
        throw new Error(`Invalid SUPABASE_SERVICE_ROLE_KEY: ${msg}`);
    }
}
//# sourceMappingURL=validate-supabase-key.js.map