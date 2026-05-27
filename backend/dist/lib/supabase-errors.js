import { AppError } from './errors.js';
export function throwIfSupabaseError(error, context) {
    if (!error)
        return;
    const msg = error.message ?? '';
    const code = error.code ?? '';
    if (code === '42501' || msg.includes('row-level security')) {
        throw new AppError('Database access denied. Fix SUPABASE_SERVICE_ROLE_KEY on the server (must be service_role, not anon).', 503, 'DATABASE_CONFIG');
    }
    if (code === 'PGRST204' || (msg.includes('column') && msg.includes('does not exist'))) {
        throw new AppError(`Database schema mismatch: ${msg}. Run \`supabase db push\` from the repo root, then restart the API.`, 503, 'DATABASE_SCHEMA');
    }
    if (code === '23505') {
        throw new AppError('An account with this email already exists', 409, 'CONFLICT');
    }
    throw new AppError(`${context}: ${msg}`, 500, 'DATABASE_ERROR', { code, details: error.details });
}
//# sourceMappingURL=supabase-errors.js.map