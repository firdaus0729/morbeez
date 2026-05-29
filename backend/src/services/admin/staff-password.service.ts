import { createHash, randomBytes } from 'node:crypto';
import { logger } from '../../lib/logger.js';
import { ValidationError } from '../../lib/errors.js';
import { hashPassword } from '../../lib/password.js';
import { validateStaffPassword } from '../../lib/staff-password-policy.js';
import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { getConsolePublicUrl } from './staff-invite.service.js';
import { employeeAccessService } from './employee-access.service.js';

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function buildResetPasswordUrl(token: string): string {
  return `${getConsolePublicUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

const FORGOT_PASSWORD_MESSAGE =
  'If an account exists for this email, you will receive a password reset link shortly.';

function forgotPasswordPayload(resetUrl: string | null, expiresAt: string | null = null) {
  return {
    ok: true as const,
    message: FORGOT_PASSWORD_MESSAGE,
    resetUrl,
    expiresAt,
  };
}

export const staffPasswordService = {
  async setAdminPassword(adminUserId: string, password: string): Promise<void> {
    validateStaffPassword(password);
    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('admin_users')
      .update({ password_hash: passwordHash, updated_at: now })
      .eq('id', adminUserId);
    throwIfSupabaseError(error, 'Could not update password');
  },

  /** Self-service forgot password (always returns the same message). */
  async requestPasswordReset(email: string) {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      throw new ValidationError('Enter a valid work email address');
    }

    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id, email, active, email_verified_at')
      .eq('email', normalized)
      .maybeSingle();
    throwIfSupabaseError(error, 'Could not look up account');

    if (!admin?.id || !admin.active || !admin.email_verified_at) {
      return forgotPasswordPayload(null);
    }

    await supabase
      .from('admin_password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('admin_user_id', admin.id)
      .is('used_at', null);

    const rawToken = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { error: insertErr } = await supabase.from('admin_password_reset_tokens').insert({
      admin_user_id: admin.id,
      token_hash: sha256(rawToken),
      expires_at: expiresAt,
    });
    throwIfSupabaseError(insertErr, 'Could not create reset token');

    const resetUrl = buildResetPasswordUrl(rawToken);
    logger.info(
      { email: admin.email, resetUrl, expiresAt },
      'Staff password reset link — send this URL to the employee'
    );

    return forgotPasswordPayload(resetUrl, expiresAt);
  },

  /** Admin-initiated reset link for an employee profile. */
  async createEmployeeResetLink(input: {
    employeeProfileId: string;
    createdBy?: string;
  }) {
    const { token, expiresAt } = await employeeAccessService.createSetupToken({
      employeeProfileId: input.employeeProfileId,
      purpose: 'reset_password',
      createdBy: input.createdBy,
      channels: ['email'],
      expiresInHours: 1,
    });
    const resetUrl = buildResetPasswordUrl(token);

    const { data: profile } = await supabase
      .from('employee_profiles')
      .select('email')
      .eq('id', input.employeeProfileId)
      .single();

    logger.info(
      {
        employeeProfileId: input.employeeProfileId,
        email: profile?.email,
        resetUrl,
        expiresAt,
      },
      'Staff password reset link (admin) — send this URL to the employee'
    );

    return { token, resetUrl, expiresAt, email: profile?.email ?? null };
  },

  async previewResetToken(rawToken: string) {
    if (!rawToken || rawToken.length < 16) {
      throw new ValidationError('Reset token is required');
    }
    const tokenHash = sha256(rawToken);

    const { data: adminToken, error: adminTokErr } = await supabase
      .from('admin_password_reset_tokens')
      .select('id, admin_user_id, expires_at, used_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    throwIfSupabaseError(adminTokErr, 'Could not validate reset token');

    if (adminToken) {
      if (adminToken.used_at) throw new ValidationError('This reset link has already been used');
      if (new Date(String(adminToken.expires_at)).getTime() < Date.now()) {
        throw new ValidationError('This reset link has expired');
      }
      const { data: admin, error: adminErr } = await supabase
        .from('admin_users')
        .select('email, full_name')
        .eq('id', adminToken.admin_user_id)
        .single();
      throwIfSupabaseError(adminErr, 'Could not load account');
      return {
        email: admin?.email ?? null,
        fullName: admin?.full_name ?? null,
        expiresAt: adminToken.expires_at,
        source: 'forgot_password' as const,
      };
    }

    const { data: empToken, error: empTokErr } = await supabase
      .from('employee_access_tokens')
      .select('id, employee_profile_id, purpose, expires_at, used_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    throwIfSupabaseError(empTokErr, 'Could not validate reset token');

    if (!empToken || empToken.purpose !== 'reset_password') {
      throw new ValidationError('Invalid or expired reset link');
    }
    if (empToken.used_at) throw new ValidationError('This reset link has already been used');
    if (new Date(String(empToken.expires_at)).getTime() < Date.now()) {
      throw new ValidationError('This reset link has expired');
    }

    const { data: profile, error: profileErr } = await supabase
      .from('employee_profiles')
      .select('email, full_name, admin_user_id')
      .eq('id', String(empToken.employee_profile_id))
      .single();
    throwIfSupabaseError(profileErr, 'Could not load employee profile');
    if (!profile?.admin_user_id) {
      throw new ValidationError('No console account is linked to this employee');
    }

    return {
      email: profile.email ?? null,
      fullName: profile.full_name ?? null,
      expiresAt: empToken.expires_at,
      source: 'admin_reset' as const,
    };
  },

  async completePasswordReset(input: {
    token: string;
    password: string;
    confirmPassword: string;
  }) {
    validateStaffPassword(input.password, input.confirmPassword);
    const tokenHash = sha256(input.token);
    const now = new Date().toISOString();
    const passwordHash = hashPassword(input.password);

    const { data: adminToken, error: adminTokErr } = await supabase
      .from('admin_password_reset_tokens')
      .select('id, admin_user_id, expires_at, used_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    throwIfSupabaseError(adminTokErr, 'Could not validate reset token');

    if (adminToken) {
      if (adminToken.used_at) throw new ValidationError('Reset link already used');
      if (new Date(String(adminToken.expires_at)).getTime() < Date.now()) {
        throw new ValidationError('Reset link expired');
      }

      const { error: updateErr } = await supabase
        .from('admin_users')
        .update({ password_hash: passwordHash, updated_at: now })
        .eq('id', adminToken.admin_user_id);
      throwIfSupabaseError(updateErr, 'Could not set new password');

      const { error: markErr } = await supabase
        .from('admin_password_reset_tokens')
        .update({ used_at: now })
        .eq('id', adminToken.id);
      throwIfSupabaseError(markErr, 'Could not finalize reset');

      const { data: admin } = await supabase
        .from('admin_users')
        .select('email')
        .eq('id', adminToken.admin_user_id)
        .single();

      return { ok: true as const, email: admin?.email ?? null };
    }

    const { data: empToken, error: empTokErr } = await supabase
      .from('employee_access_tokens')
      .select('id, employee_profile_id, purpose, expires_at, used_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    throwIfSupabaseError(empTokErr, 'Could not validate reset token');

    if (!empToken || empToken.purpose !== 'reset_password') {
      throw new ValidationError('Invalid reset link');
    }
    if (empToken.used_at) throw new ValidationError('Reset link already used');
    if (new Date(String(empToken.expires_at)).getTime() < Date.now()) {
      throw new ValidationError('Reset link expired');
    }

    const { data: profile, error: profileErr } = await supabase
      .from('employee_profiles')
      .select('admin_user_id, email')
      .eq('id', String(empToken.employee_profile_id))
      .single();
    throwIfSupabaseError(profileErr, 'Could not resolve employee');
    if (!profile?.admin_user_id) {
      throw new ValidationError('No console account linked to this employee');
    }

    const { error: updateAdminErr } = await supabase
      .from('admin_users')
      .update({ password_hash: passwordHash, active: true, updated_at: now })
      .eq('id', profile.admin_user_id);
    throwIfSupabaseError(updateAdminErr, 'Could not set new password');

    const { error: tokenUseErr } = await supabase
      .from('employee_access_tokens')
      .update({ used_at: now })
      .eq('id', empToken.id);
    throwIfSupabaseError(tokenUseErr, 'Could not mark reset token used');

    return { ok: true as const, email: profile.email };
  },
};
