import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { UnauthorizedError, ValidationError } from '../../lib/errors.js';
import { verifyPassword } from '../../lib/password.js';
import { createAdminToken } from '../../lib/admin-jwt.js';
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
function publicAdmin(row) {
    return {
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        role: row.role,
        lastLoginAt: row.last_login_at,
        createdAt: row.created_at,
    };
}
export const adminAuthService = {
    async login(input) {
        const email = normalizeEmail(input.email);
        if (!input.password)
            throw new ValidationError('Password is required');
        const { data, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('email', email)
            .eq('active', true)
            .maybeSingle();
        throwIfSupabaseError(error, 'Could not load admin account');
        if (!data?.password_hash)
            throw new UnauthorizedError('Invalid email or password');
        if (!verifyPassword(input.password, data.password_hash)) {
            throw new UnauthorizedError('Invalid email or password');
        }
        const now = new Date().toISOString();
        await supabase.from('admin_users').update({ last_login_at: now, updated_at: now }).eq('id', data.id);
        const token = createAdminToken(data.id, email, data.role);
        return { token, admin: publicAdmin({ ...data, last_login_at: now }) };
    },
    async me(adminId) {
        const { data, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('id', adminId)
            .eq('active', true)
            .single();
        if (error || !data)
            throw new UnauthorizedError('Session invalid');
        return publicAdmin(data);
    },
};
//# sourceMappingURL=admin-auth.service.js.map