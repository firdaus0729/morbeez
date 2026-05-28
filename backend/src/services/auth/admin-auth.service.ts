import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { UnauthorizedError, ValidationError } from '../../lib/errors.js';
import { verifyPassword } from '../../lib/password.js';
import { createAdminToken } from '../../lib/admin-jwt.js';

export interface AdminLoginInput {
  email: string;
  password: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function publicAdmin(row: Record<string, unknown>) {
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
  async login(input: AdminLoginInput) {
    const email = normalizeEmail(input.email);
    if (!input.password) throw new ValidationError('Password is required');

    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    throwIfSupabaseError(error, 'Could not load admin account');
    if (!data?.password_hash) throw new UnauthorizedError('Invalid email or password');

    if (!data.active) {
      if (!data.email_verified_at) {
        throw new UnauthorizedError(
          'Activate your account using the invitation link sent to your email'
        );
      }
      throw new UnauthorizedError('Account is inactive');
    }

    if (!data.email_verified_at && data.role !== 'super_admin') {
      throw new UnauthorizedError('Complete email verification using your invitation link');
    }

    if (!verifyPassword(input.password, data.password_hash)) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const now = new Date().toISOString();
    await supabase.from('admin_users').update({ last_login_at: now, updated_at: now }).eq('id', data.id);

    const token = createAdminToken(data.id, email, data.role);
    return { token, admin: publicAdmin({ ...data, last_login_at: now }) };
  },

  async me(adminId: string) {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', adminId)
      .eq('active', true)
      .single();

    if (error || !data) throw new UnauthorizedError('Session invalid');
    return publicAdmin(data);
  },
};
