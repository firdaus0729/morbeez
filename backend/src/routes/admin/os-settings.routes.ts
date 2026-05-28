import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { assertModuleAccess } from '../../lib/rbac.js';
import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { logAdminMutation } from '../../lib/admin-mutation-audit.js';
import { assertSuperAdminDeactivationAllowed } from '../../lib/admin-guards.js';

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

  app.patch(`${api}/staff/:id`, async (request, reply) => {
    const actor = await assertModuleAccess(request, 'settings', 'write');
    const { id } = request.params as { id: string };
    const body = z
      .object({
        fullName: z.string().min(2).max(120).optional(),
        role: z
          .enum([
            'super_admin',
            'admin',
            'operations',
            'agronomist',
            'telecaller',
            'manager',
            'viewer',
          ])
          .optional(),
        active: z.boolean().optional(),
      })
      .parse(request.body);
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.fullName !== undefined) patch.full_name = body.fullName;
    if (body.role !== undefined) patch.role = body.role;
    if (body.active !== undefined) patch.active = body.active;
    const { data, error } = await supabase
      .from('admin_users')
      .update(patch)
      .eq('id', id)
      .select('id, email, full_name, role, active, last_login_at, created_at')
      .single();
    throwIfSupabaseError(error, 'Could not update staff');
    await logAdminMutation({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'update',
      resource: 'admin_users',
      resourceId: id,
      details: body,
    });
    return reply.send({ ok: true, staff: data });
  });

  app.delete(`${api}/staff/:id`, async (request, reply) => {
    const actor = await assertModuleAccess(request, 'settings', 'write');
    const { id } = request.params as { id: string };
    if (actor.id === id) {
      return reply.code(400).send({ ok: false, message: 'You cannot deactivate your own account' });
    }
    const { data: row, error: rowError } = await supabase
      .from('admin_users')
      .select('role, active')
      .eq('id', id)
      .maybeSingle();
    throwIfSupabaseError(rowError, 'Could not validate staff account');
    if (row?.role === 'super_admin' && row?.active) {
      const { count, error: countError } = await supabase
        .from('admin_users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'super_admin')
        .eq('active', true);
      throwIfSupabaseError(countError, 'Could not validate super admin guard');
      try {
        assertSuperAdminDeactivationAllowed({
          role: row.role as string,
          active: Boolean(row.active),
          activeSuperAdminCount: count ?? 0,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Cannot deactivate super admin';
        return reply.code(400).send({ ok: false, message });
      }
    }
    const { error } = await supabase
      .from('admin_users')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    throwIfSupabaseError(error, 'Could not deactivate staff');
    await logAdminMutation({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'archive',
      resource: 'admin_users',
      resourceId: id,
    });
    return reply.send({ ok: true });
  });
}
