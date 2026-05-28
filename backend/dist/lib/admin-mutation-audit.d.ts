type AuditEvent = {
    actorId?: string;
    actorEmail?: string;
    action: 'create' | 'update' | 'archive' | 'delete';
    resource: string;
    resourceId?: string;
    details?: Record<string, unknown>;
};
/**
 * Best-effort audit logging; intentionally non-blocking for primary mutation flow.
 */
export declare function logAdminMutation(event: AuditEvent): Promise<void>;
export {};
//# sourceMappingURL=admin-mutation-audit.d.ts.map