import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { ConflictError, UnauthorizedError, ValidationError } from '../../lib/errors.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { createFarmerToken } from '../../lib/jwt.js';
import { eventBus } from '../../events/bus.js';
import { isValidIndianPhone, normalizePhone } from '../../lib/phone.js';

export interface SignupInput {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  acceptTerms: boolean;
  newsletter: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function publicFarmer(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    name: row.name,
    phone: row.phone,
    district: row.district,
    state: row.state,
    newsletterSubscribed: row.newsletter_subscribed,
    createdAt: row.created_at,
  };
}

export const farmerAuthService = {
  async signup(input: SignupInput) {
    const email = normalizeEmail(input.email);
    if (!input.acceptTerms) {
      throw new ValidationError('You must accept the Terms of Service and Privacy Policy');
    }
    if (input.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }
    if (!isValidIndianPhone(input.phone)) {
      throw new ValidationError('Enter a valid 10-digit Indian WhatsApp mobile number');
    }

    const phone = normalizePhone(input.phone);
    const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
    const now = new Date().toISOString();

    const { data: existingEmail, error: existingEmailErr } = await supabase
      .from('farmers')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    throwIfSupabaseError(existingEmailErr, 'Could not check existing account');
    if (existingEmail) throw new ConflictError('An account with this email already exists');

    const { data: existingPhone, error: existingPhoneErr } = await supabase
      .from('farmers')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();
    throwIfSupabaseError(existingPhoneErr, 'Could not check WhatsApp number');

    const signupPayload = {
      email,
      phone,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      name: fullName,
      password_hash: hashPassword(input.password),
      terms_accepted_at: now,
      newsletter_subscribed: input.newsletter,
      preferred_language: 'en',
      source: 'website',
      metadata: {
        signup_channel: 'website',
        whatsapp_opt_in: true,
      },
      last_login_at: now,
      updated_at: now,
    };

    let data: Record<string, unknown>;

    if (existingPhone) {
      if (existingPhone.email && existingPhone.email !== email) {
        throw new ConflictError('This WhatsApp number is already linked to another account');
      }
      if (existingPhone.password_hash) {
        throw new ConflictError('This WhatsApp number already has a website account. Please log in.');
      }

      const { data: merged, error: mergeErr } = await supabase
        .from('farmers')
        .update({
          ...signupPayload,
          metadata: {
            ...(typeof existingPhone.metadata === 'object' && existingPhone.metadata !== null
              ? existingPhone.metadata
              : {}),
            signup_channel: 'website',
            whatsapp_opt_in: true,
            website_linked_at: now,
          },
        })
        .eq('id', existingPhone.id)
        .select()
        .single();

      throwIfSupabaseError(mergeErr, 'Could not link WhatsApp number to your account');
      data = merged;
    } else {
      const { data: created, error } = await supabase.from('farmers').insert(signupPayload).select().single();
      throwIfSupabaseError(error, 'Could not create farmer account');
      data = created;
    }

    try {
      await eventBus.publish(
        'farmer.upserted',
        { farmerId: data.id, email, phone, source: 'website' },
        'farmer-auth'
      );
    } catch {
      /* signup succeeds even if outbox write fails */
    }

    const token = createFarmerToken(data.id as string, email);
    return { token, farmer: publicFarmer(data) };
  },

  async login(input: LoginInput) {
    const email = normalizeEmail(input.email);

    const { data, error } = await supabase.from('farmers').select('*').eq('email', email).maybeSingle();
    throwIfSupabaseError(error, 'Could not load account');
    if (!data?.password_hash) throw new UnauthorizedError('Invalid email or password');

    if (!verifyPassword(input.password, data.password_hash)) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const now = new Date().toISOString();
    await supabase.from('farmers').update({ last_login_at: now, updated_at: now }).eq('id', data.id);

    const token = createFarmerToken(data.id, email);
    return { token, farmer: publicFarmer({ ...data, last_login_at: now }) };
  },

  async me(farmerId: string) {
    const { data, error } = await supabase.from('farmers').select('*').eq('id', farmerId).single();
    if (error || !data) throw new UnauthorizedError('Session invalid');
    if (!data.email) throw new UnauthorizedError('Session invalid');
    return publicFarmer(data);
  },
};
