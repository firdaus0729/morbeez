import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { runBroadcastsNow } from '../whatsapp/broadcasts/whatsapp-broadcast.worker.js';
export const whatsappBroadcastAdminService = {
    async listRules() {
        const { data, error } = await supabase
            .from('crop_dap_broadcast_rules')
            .select('*')
            .order('priority', { ascending: false });
        throwIfSupabaseError(error, 'Could not load broadcast rules');
        return data ?? [];
    },
    async listDeliveries(params) {
        let q = supabase
            .from('whatsapp_broadcast_deliveries')
            .select('*, farmers(phone, name, district)')
            .order('created_at', { ascending: false })
            .limit(params.limit ?? 50);
        if (params.farmerId)
            q = q.eq('farmer_id', params.farmerId);
        const { data, error } = await q;
        throwIfSupabaseError(error, 'Could not load broadcast deliveries');
        return data ?? [];
    },
    async runBroadcasts(params) {
        return runBroadcastsNow({
            farmerId: params.farmerId,
            dryRun: params.dryRun,
            kinds: params.kinds,
        });
    },
    async upsertRule(row) {
        const payload = {
            crop_type: row.cropType,
            broadcast_kind: row.broadcastKind,
            target_dap: row.targetDap ?? null,
            dap_tolerance: row.dapTolerance ?? 3,
            min_dap: row.minDap ?? null,
            max_dap: row.maxDap ?? null,
            weekday: row.weekday ?? null,
            priority: row.priority ?? 50,
            active: row.active ?? true,
            updated_at: new Date().toISOString(),
        };
        if (row.id) {
            const { data, error } = await supabase
                .from('crop_dap_broadcast_rules')
                .update(payload)
                .eq('id', row.id)
                .select('*')
                .single();
            throwIfSupabaseError(error, 'Could not update broadcast rule');
            return data;
        }
        const { data, error } = await supabase
            .from('crop_dap_broadcast_rules')
            .insert(payload)
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not create broadcast rule');
        return data;
    },
};
//# sourceMappingURL=whatsapp-broadcast-admin.service.js.map