import type { FastifyRequest } from 'fastify';
export type AdminRequest = FastifyRequest & {
    admin: {
        id: string;
        email: string;
        role: string;
    };
};
export declare function requireAdmin(request: FastifyRequest): AdminRequest['admin'];
export declare function requireAdminRole(request: FastifyRequest, ...roles: string[]): void;
//# sourceMappingURL=adminAuth.d.ts.map