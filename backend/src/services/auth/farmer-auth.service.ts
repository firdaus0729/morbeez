import { supabase } from '../../lib/supabase.js';
import { ConflictError, UnauthorizedError, ValidationError } from '../../lib/errors.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { createFarmerToken } from '../../lib/jwt.js';
import { eventBus } from '../../events/bus.js';

export interface SignupInput {
  email: string;
  firstName: string;
  lastName: string;
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

    const { data: existing } = await supabase.from('farmers').select('id').eq('email', email).maybeSingle();
    if (existing) throw new ConflictError('An account with this email already exists');

    const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('farmers')
      .insert({
        email,
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        name: fullName,
        password_hash: hashPassword(input.password),
        terms_accepted_at: now,
        newsletter_subscribed: input.newsletter,
        preferred_language: 'en',
        source: 'website',
        metadata: { signup_channel: 'website' },
        last_login_at: now,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new ConflictError('An account with this email already exists');
      throw error;
    }

    await eventBus.publish('farmer.upserted', { farmerId: data.id, email, source: 'website' }, 'farmer-auth');

    const token = createFarmerToken(data.id, email);
    return { token, farmer: publicFarmer(data) };
  },

  async login(input: LoginInput) {
    const email = normalizeEmail(input.email);

    const { data, error } = await supabase.from('farmers').select('*').eq('email', email).maybeSingle();
    if (error) throw error;
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
