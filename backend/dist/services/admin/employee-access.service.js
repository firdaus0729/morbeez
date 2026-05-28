import { createHash, randomBytes } from 'node:crypto';
import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { ValidationError } from '../../lib/errors.js';
import { hashPassword } from '../../lib/password.js';
function sha256(input) {
    return createHash('sha256').update(input).digest('hex');
}
export const employeeAccessService = {
    async createSetupToken(input) {
        const rawToken = randomBytes(24).toString('hex');
        const tokenHash = sha256(rawToken);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const { error } = await supabase.from('employee_access_tokens').insert({
            employee_profile_id: input.employeeProfileId,
            token_hash: tokenHash,
            purpose: input.purpose,
            delivery_channels: input.channels,
            expires_at: expiresAt,
            created_by: input.createdBy ?? null,
        });
        throwIfSupabaseError(error, 'Could not create setup token');
        return { token: rawToken, expiresAt };
    },
    async consumeToken(input) {
        if (!input.password || input.password.length < 8) {
            throw new ValidationError('Password must be at least 8 characters');
        }
        const tokenHash = sha256(input.token);
        const { data, error } = await supabase
            .from('employee_access_tokens')
            .select('id, employee_profile_id, expires_at, used_at')
            .eq('token_hash', tokenHash)
            .maybeSingle();
        throwIfSupabaseError(error, 'Could not validate setup token');
        if (!data)
            throw new ValidationError('Invalid token');
        if (data.used_at)
            throw new ValidationError('Token already used');
        if (new Date(String(data.expires_at)).getTime() < Date.now()) {
            throw new ValidationError('Token expired');
        }
        const { data: profile, error: profileError } = await supabase
            .from('employee_profiles')
            .select('admin_user_id, email, full_name, role')
            .eq('id', String(data.employee_profile_id))
            .single();
        throwIfSupabaseError(profileError, 'Could not resolve employee profile');
        if (!profile)
            throw new ValidationError('Employee profile not found');
        const passwordHash = hashPassword(input.password);
        if (profile.admin_user_id) {
            const { error: updateAdminErr } = await supabase
                .from('admin_users')
                .update({ password_hash: passwordHash, active: true, updated_at: new Date().toISOString() })
                .eq('id', profile.admin_user_id);
            throwIfSupabaseError(updateAdminErr, 'Could not set password');
        }
        else {
            const { data: createdAdmin, error: createAdminErr } = await supabase
                .from('admin_users')
                .insert({
                email: String(profile.email).toLowerCase(),
                full_name: profile.full_name,
                role: profile.role,
                password_hash: passwordHash,
                active: true,
            })
                .select('id')
                .single();
            throwIfSupabaseError(createAdminErr, 'Could not create admin account');
            if (!createdAdmin)
                throw new ValidationError('Could not create admin account');
            const { error: profilePatchErr } = await supabase
                .from('employee_profiles')
                .update({ admin_user_id: createdAdmin.id, status: 'active' })
                .eq('id', String(data.employee_profile_id));
            throwIfSupabaseError(profilePatchErr, 'Could not link employee account');
        }
        const { error: tokenUseErr } = await supabase
            .from('employee_access_tokens')
            .update({ used_at: new Date().toISOString() })
            .eq('id', data.id);
        throwIfSupabaseError(tokenUseErr, 'Could not mark token used');
        return { ok: true };
    },
};
//# sourceMappingURL=employee-access.service.js.map