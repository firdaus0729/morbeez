import { createHash, randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';
import { STAFF_PORTAL_PATH } from '../../lib/staff-portal.js';
import { logger } from '../../lib/logger.js';
import { ValidationError } from '../../lib/errors.js';
import { hashPassword } from '../../lib/password.js';
import { validateStaffPassword } from '../../lib/staff-password-policy.js';
import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { employeeAccessService } from './employee-access.service.js';
function sha256(input) {
    return createHash('sha256').update(input).digest('hex');
}
/** Staff SPA base URL for invite/reset links (always uses /morbeez-staff, not legacy /console). */
export function getConsolePublicUrl() {
    const api = env.API_BASE_URL?.replace(/\/$/, '');
    if (env.CONSOLE_PUBLIC_URL) {
        let base = env.CONSOLE_PUBLIC_URL.replace(/\/$/, '');
        if (base.endsWith('/console')) {
            base = `${base.slice(0, -'/console'.length)}${STAFF_PORTAL_PATH}`;
        }
        else if (!base.endsWith(STAFF_PORTAL_PATH)) {
            base = `${base}${STAFF_PORTAL_PATH}`;
        }
        return base;
    }
    if (api)
        return `${api}${STAFF_PORTAL_PATH}`;
    return `http://localhost:3000${STAFF_PORTAL_PATH}`;
}
export function buildInviteUrl(token) {
    return `${getConsolePublicUrl()}/accept-invite?token=${encodeURIComponent(token)}`;
}
export const staffInviteService = {
    async ensurePendingAdminUser(employeeProfileId) {
        const { data: profile, error } = await supabase
            .from('employee_profiles')
            .select('id, admin_user_id, email, full_name, role')
            .eq('id', employeeProfileId)
            .single();
        throwIfSupabaseError(error, 'Could not load employee profile');
        if (!profile?.email) {
            throw new ValidationError('Employee email is required before sending a console invite');
        }
        const email = String(profile.email).trim().toLowerCase();
        const now = new Date().toISOString();
        const placeholderHash = hashPassword(randomBytes(32).toString('hex'));
        if (profile.admin_user_id) {
            const { data: adminRow, error: adminErr } = await supabase
                .from('admin_users')
                .select('id, email_verified_at')
                .eq('id', profile.admin_user_id)
                .maybeSingle();
            throwIfSupabaseError(adminErr, 'Could not load admin account');
            if (adminRow?.email_verified_at)
                return String(adminRow.id);
            const { error: updateErr } = await supabase
                .from('admin_users')
                .update({
                email,
                full_name: profile.full_name,
                role: profile.role,
                active: false,
                email_verified_at: null,
                updated_at: now,
            })
                .eq('id', profile.admin_user_id);
            throwIfSupabaseError(updateErr, 'Could not prepare admin account');
            return String(profile.admin_user_id);
        }
        const { data: existing, error: existingErr } = await supabase
            .from('admin_users')
            .select('id, email_verified_at')
            .eq('email', email)
            .maybeSingle();
        throwIfSupabaseError(existingErr, 'Could not check existing admin account');
        if (existing?.id) {
            if (!existing.email_verified_at) {
                const { error: pendingErr } = await supabase
                    .from('admin_users')
                    .update({ active: false, email_verified_at: null, updated_at: now })
                    .eq('id', existing.id);
                throwIfSupabaseError(pendingErr, 'Could not prepare admin account');
            }
            const { error: linkErr } = await supabase
                .from('employee_profiles')
                .update({ admin_user_id: existing.id, updated_at: now })
                .eq('id', employeeProfileId);
            throwIfSupabaseError(linkErr, 'Could not link employee to admin account');
            return String(existing.id);
        }
        const { data: created, error: createErr } = await supabase
            .from('admin_users')
            .insert({
            email,
            full_name: profile.full_name,
            role: profile.role,
            password_hash: placeholderHash,
            active: false,
            email_verified_at: null,
            updated_at: now,
        })
            .select('id')
            .single();
        throwIfSupabaseError(createErr, 'Could not create pending admin account');
        if (!created?.id)
            throw new ValidationError('Could not create pending admin account');
        const { error: profilePatchErr } = await supabase
            .from('employee_profiles')
            .update({ admin_user_id: created.id, updated_at: now })
            .eq('id', employeeProfileId);
        throwIfSupabaseError(profilePatchErr, 'Could not link employee account');
        return String(created.id);
    },
    async createInvite(input) {
        await this.ensurePendingAdminUser(input.employeeProfileId);
        const { data: profile } = await supabase
            .from('employee_profiles')
            .select('email, full_name, role')
            .eq('id', input.employeeProfileId)
            .single();
        const { token, expiresAt } = await employeeAccessService.createSetupToken({
            employeeProfileId: input.employeeProfileId,
            purpose: 'email_invite',
            createdBy: input.createdBy,
            channels: ['email'],
        });
        const inviteUrl = buildInviteUrl(token);
        logger.info({
            employeeProfileId: input.employeeProfileId,
            email: profile?.email,
            inviteUrl,
            expiresAt,
        }, 'Console invite link created — send this URL to the employee');
        return {
            token,
            inviteUrl,
            expiresAt,
            email: profile?.email ?? null,
            fullName: profile?.full_name ?? null,
            role: profile?.role ?? null,
        };
    },
    async previewToken(rawToken) {
        if (!rawToken || rawToken.length < 16) {
            throw new ValidationError('Invite token is required');
        }
        const tokenHash = sha256(rawToken);
        const { data, error } = await supabase
            .from('employee_access_tokens')
            .select('id, employee_profile_id, purpose, expires_at, used_at')
            .eq('token_hash', tokenHash)
            .maybeSingle();
        throwIfSupabaseError(error, 'Could not validate invite token');
        if (!data)
            throw new ValidationError('Invalid or expired invitation link');
        if (data.used_at)
            throw new ValidationError('This invitation link has already been used');
        if (new Date(String(data.expires_at)).getTime() < Date.now()) {
            throw new ValidationError('This invitation link has expired');
        }
        if (!['email_invite', 'setup_password'].includes(String(data.purpose))) {
            throw new ValidationError('This link cannot be used for account activation');
        }
        const { data: profile, error: profileError } = await supabase
            .from('employee_profiles')
            .select('email, full_name, role')
            .eq('id', String(data.employee_profile_id))
            .single();
        throwIfSupabaseError(profileError, 'Could not load employee profile');
        return {
            email: profile?.email ?? null,
            fullName: profile?.full_name ?? null,
            role: profile?.role ?? null,
            expiresAt: data.expires_at,
            purpose: data.purpose,
        };
    },
    async completeInvite(input) {
        validateStaffPassword(input.password, input.confirmPassword);
        const tokenHash = sha256(input.token);
        const { data, error } = await supabase
            .from('employee_access_tokens')
            .select('id, employee_profile_id, purpose, expires_at, used_at')
            .eq('token_hash', tokenHash)
            .maybeSingle();
        throwIfSupabaseError(error, 'Could not validate invite token');
        if (!data)
            throw new ValidationError('Invalid invitation link');
        if (data.used_at)
            throw new ValidationError('Invitation link already used');
        if (new Date(String(data.expires_at)).getTime() < Date.now()) {
            throw new ValidationError('Invitation link expired');
        }
        if (!['email_invite', 'setup_password'].includes(String(data.purpose))) {
            throw new ValidationError('Invalid invitation link type');
        }
        const profileId = String(data.employee_profile_id);
        await this.ensurePendingAdminUser(profileId);
        const { data: profile, error: profileError } = await supabase
            .from('employee_profiles')
            .select('admin_user_id, email, full_name, role')
            .eq('id', profileId)
            .single();
        throwIfSupabaseError(profileError, 'Could not resolve employee profile');
        if (!profile?.admin_user_id) {
            throw new ValidationError('Could not resolve console account for this employee');
        }
        const passwordHash = hashPassword(input.password);
        const now = new Date().toISOString();
        const { error: updateAdminErr } = await supabase
            .from('admin_users')
            .update({
            password_hash: passwordHash,
            active: true,
            email_verified_at: now,
            updated_at: now,
        })
            .eq('id', profile.admin_user_id);
        throwIfSupabaseError(updateAdminErr, 'Could not activate console account');
        const { error: profilePatchErr } = await supabase
            .from('employee_profiles')
            .update({ status: 'active', updated_at: now })
            .eq('id', profileId);
        throwIfSupabaseError(profilePatchErr, 'Could not update employee status');
        const { error: tokenUseErr } = await supabase
            .from('employee_access_tokens')
            .update({ used_at: now })
            .eq('id', data.id);
        throwIfSupabaseError(tokenUseErr, 'Could not mark invitation used');
        return { ok: true, email: profile.email };
    },
};
//# sourceMappingURL=staff-invite.service.js.map