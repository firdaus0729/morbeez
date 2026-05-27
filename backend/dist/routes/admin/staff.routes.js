import { assertModuleAccess } from '../../lib/rbac.js';
import { staffAdminService } from '../../services/admin/staff-admin.service.js';
import { AppError } from '../../lib/errors.js';
export async function staffRoutes(app) {
    const api = '/console/api/v1/staff';
    app.get(`${api}/workspace`, async (request, reply) => {
        await assertModuleAccess(request, 'settings', 'read');
        const workspace = await staffAdminService.getWorkspace();
        return reply.send({ ok: true, ...workspace });
    });
    app.get(`${api}/:id`, async (request, reply) => {
        await assertModuleAccess(request, 'settings', 'read');
        const { id } = request.params;
        const detail = await staffAdminService.getEmployeeDetail(id);
        if (!detail) {
            throw new AppError('Employee not found', 404, 'NOT_FOUND');
        }
        return reply.send({ ok: true, ...detail });
    });
}
//# sourceMappingURL=staff.routes.js.map