import { supabase } from './supabase.js';
/**
 * Best-effort audit logging; intentionally non-blocking for primary mutation flow.
 */
export async function logAdminMutation(event) {
    try {
        await supabase.from('admin_mutation_audit').insert({
            actor_id: event.actorId ?? null,
            actor_email: event.actorEmail ?? null,
            action: event.action,
            resource: event.resource,
            resource_id: event.resourceId ?? null,
            details: event.details ?? {},
            created_at: new Date().toISOString(),
        });
    }
    catch {
        // Avoid breaking user mutations if audit table is unavailable.
    }
}
//# sourceMappingURL=admin-mutation-audit.js.map