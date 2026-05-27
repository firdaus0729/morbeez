import type { FastifyInstance } from 'fastify';
import { assertModuleAccess } from '../../lib/rbac.js';
import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';

export async function osSettingsRoutes(app: FastifyInstance): Promise<void> {
  const api = '/console/api/v1/os/settings';

  app.get(`${api}/staff`, async (request, reply) => {
    await assertModuleAccess(request, 'settings', 'read');
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, full_name, role, active, last_login_at, created_at')
      .order('created_at', { ascending: false });

    throwIfSupabaseError(error, 'Could not load staff');
    return reply.send({
      ok: true,
      staff: (data ?? []).map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        role: u.role,
        active: u.active,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
      })),
    });
  });
}
