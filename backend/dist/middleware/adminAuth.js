import { verifyAdminToken } from '../lib/admin-jwt.js';
import { getBearerToken } from '../lib/jwt.js';
import { UnauthorizedError } from '../lib/errors.js';
export function requireAdmin(request) {
    const token = getBearerToken(request.headers.authorization);
    if (!token)
        throw new UnauthorizedError('Admin sign-in required');
    const payload = verifyAdminToken(token);
    return { id: payload.sub, email: payload.email, role: payload.role };
}
export function requireAdminRole(request, ...roles) {
    const admin = requireAdmin(request);
    if (!roles.includes(admin.role)) {
        throw new UnauthorizedError('Insufficient permissions');
    }
}
//# sourceMappingURL=adminAuth.js.map