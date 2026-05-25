import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { assertSupabaseServiceRoleKey } from './validate-supabase-key.js';
assertSupabaseServiceRoleKey(env.SUPABASE_SERVICE_ROLE_KEY);
/** Service-role client — server only. Never expose to browser. */
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});
//# sourceMappingURL=supabase.js.map