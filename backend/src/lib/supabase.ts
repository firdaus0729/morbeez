import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

/** Service-role client — server only. Never expose to browser. */
export const supabase: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);
