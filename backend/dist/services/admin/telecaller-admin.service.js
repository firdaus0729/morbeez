import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError } from '../../lib/errors.js';
import { leadService } from '../crm/lead.service.js';
import { whatsappService } from '../whatsapp/whatsapp.service.js';
const STAGE_LABELS = {
    new_lead: 'New Lead',
    interested: 'Interested',
    follow_up: 'Follow-up',
    recommendation: 'Recommendation',
    order_placed: 'Order Placed',
    repeat_customer: 'Repeat Customer',
};
function displayFarmerName(row) {
    const first = String(row.first_name ?? '').trim();
    const last = String(row.last_name ?? '').trim();
    const combined = [first, last].filter(Boolean).join(' ');
    if (combined)
        return combined;
    return String(row.name ?? '').trim() || 'Farmer';
}
function initials(name) {
    return (name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('') || 'F');
}
function normalizePhone(phone) {
    if (!phone)
        return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10)
        return digits.slice(-10);
    return digits || null;
}
function formatDateTime(iso) {
    if (!iso)
        return null;
    try {
        return new Date(iso).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    }
    catch {
        return iso;
    }
}
function mapLeadRow(row) {
    const farmer = row.farmers;
    const name = farmer ? displayFarmerName(farmer) : 'Unknown';
    const stage = String(row.stage ?? 'new_lead');
    return {
        id: row.id,
        farmerId: row.farmer_id,
        intent: row.intent,
        source: row.source,
        status: row.status,
        stage,
        stageLabel: STAGE_LABELS[stage] ?? stage,
        priority: row.priority,
        assignedTo: row.assigned_to,
        notes: row.notes,
        followUpAt: row.follow_up_at,
        followUpLabel: formatDateTime(row.follow_up_at),
        lastInteractionAt: row.last_interaction_at,
        lastInteractionLabel: formatDateTime(row.last_interaction_at),
        leadScore: row.lead_score != null ? Number(row.lead_score) : 4.5,
        createdAt: row.created_at,
        farmerName: name,
        farmerInitials: initials(name),
        phone: farmer?.phone ?? null,
        district: farmer?.district ?? null,
        state: farmer?.state ?? null,
        farmerStatus: row.status === 'won' ? 'customer' : 'active',
    };
}
async function logInteraction(farmerId, channel, content, direction = 'outbound') {
    await supabase.from('interaction_logs').insert({
        farmer_id: farmerId,
        channel,
        direction,
        message_type: 'note',
        content,
    });
}
async function touchLead(leadId, _farmerId) {
    const now = new Date().toISOString();
    await supabase
        .from('leads')
        .update({ last_interaction_at: now, updated_at: now })
        .eq('id', leadId);
    return now;
}
export const telecallerAdminService = {
    stageLabels: STAGE_LABELS,
    async getOverview(agentEmail) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayIso = todayStart.toISOString();
        const [callsRes, tasksRes, leadsRes, ordersRes] = await Promise.all([
            supabase
                .from('crm_call_logs')
                .select('id', { count: 'exact', head: true })
                .eq('agent_email', agentEmail)
                .gte('created_at', todayIso),
            supabase
                .from('crm_tasks')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending')
                .or(`assigned_to.eq.${agentEmail},assigned_to.is.null`),
            supabase
                .from('leads')
                .select('id', { count: 'exact', head: true })
                .eq('stage', 'interested'),
            supabase.from('commerce_orders').select('total_amount, phone, created_at').limit(5000),
        ]);
        throwIfSupabaseError(callsRes.error, 'Could not load overview');
        throwIfSupabaseError(tasksRes.error, 'Could not load overview');
        throwIfSupabaseError(leadsRes.error, 'Could not load overview');
        throwIfSupabaseError(ordersRes.error, 'Could not load overview');
        const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
        let ordersGenerated = 0;
        let revenue = 0;
        for (const o of ordersRes.data ?? []) {
            const created = new Date(String(o.created_at));
            if (created >= monthStart) {
                ordersGenerated += 1;
                revenue += Number(o.total_amount) || 0;
            }
        }
        const { count: myLeads } = await supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('assigned_to', agentEmail);
        const interested = leadsRes.count ?? 0;
        const conversionRate = (myLeads ?? 0) > 0 ? Math.round(((ordersGenerated / (myLeads ?? 1)) * 100) * 10) / 10 : 0;
        return {
            callsToday: callsRes.count ?? 0,
            pendingFollowUps: tasksRes.count ?? 0,
            interestedFarmers: interested,
            ordersGenerated,
            revenue: Math.round(revenue),
            conversionRate,
            myLeadsCount: myLeads ?? 0,
            allLeadsCount: 0,
        };
    },
    async listLeads(query, agentEmail) {
        const page = Math.max(1, query.page ?? 1);
        const limit = Math.min(50, Math.max(1, query.limit ?? 20));
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        let builder = supabase
            .from('leads')
            .select('*, farmers(phone, name, first_name, last_name, district, state, preferred_language)', {
            count: 'exact',
        })
            .order('updated_at', { ascending: false });
        if (query.scope === 'mine') {
            builder = builder.eq('assigned_to', agentEmail);
        }
        if (query.stage && query.stage !== 'all') {
            builder = builder.eq('stage', query.stage);
        }
        const { data, error, count } = await builder.range(from, to);
        throwIfSupabaseError(error, 'Could not load leads');
        let rows = (data ?? []).map((r) => mapLeadRow(r));
        if (query.search?.trim()) {
            const term = query.search.trim().toLowerCase();
            rows = rows.filter((l) => {
                const hay = [l.farmerName, l.phone, l.notes, l.stageLabel].filter(Boolean).join(' ').toLowerCase();
                return hay.includes(term);
            });
        }
        const [{ count: myCount }, { count: allCount }] = await Promise.all([
            supabase
                .from('leads')
                .select('id', { count: 'exact', head: true })
                .eq('assigned_to', agentEmail),
            supabase.from('leads').select('id', { count: 'exact', head: true }),
        ]);
        return {
            leads: rows,
            counts: { mine: myCount ?? 0, all: allCount ?? 0 },
            pagination: {
                page,
                limit,
                total: count ?? rows.length,
                pages: Math.max(1, Math.ceil((count ?? rows.length) / limit)),
            },
        };
    },
    async getLeadDetail(leadId) {
        const { data, error } = await supabase
            .from('leads')
            .select('*, farmers(id, phone, name, first_name, last_name, district, state, village, preferred_language, metadata, created_at)')
            .eq('id', leadId)
            .single();
        if (error || !data)
            throw new NotFoundError('Lead not found');
        const lead = mapLeadRow(data);
        const farmer = data.farmers;
        const farmerId = String(data.farmer_id);
        const [cropsRes, tasksRes, callsRes, interactionsRes, ordersRes] = await Promise.all([
            supabase.from('farmer_crops').select('crop_type, acreage, is_primary').eq('farmer_id', farmerId),
            supabase
                .from('crm_tasks')
                .select('*')
                .eq('farmer_id', farmerId)
                .order('due_at', { ascending: true })
                .limit(20),
            supabase
                .from('crm_call_logs')
                .select('*')
                .eq('farmer_id', farmerId)
                .order('created_at', { ascending: false })
                .limit(20),
            supabase
                .from('interaction_logs')
                .select('*')
                .eq('farmer_id', farmerId)
                .order('created_at', { ascending: false })
                .limit(30),
            supabase
                .from('commerce_orders')
                .select('id, order_name, total_amount, created_at, phone')
                .not('phone', 'is', null)
                .order('created_at', { ascending: false })
                .limit(100),
        ]);
        const phoneKey = normalizePhone(String(farmer?.phone ?? ''));
        const orders = (ordersRes.data ?? []).filter((o) => normalizePhone(String(o.phone)) === phoneKey);
        const timeline = [];
        for (const c of callsRes.data ?? []) {
            timeline.push({
                id: String(c.id),
                type: 'call',
                title: `Call ${c.direction === 'inbound' ? 'received' : 'completed'}`,
                detail: String(c.outcome ?? c.notes ?? ''),
                at: String(c.created_at),
                atLabel: formatDateTime(c.created_at) ?? '',
            });
        }
        for (const i of interactionsRes.data ?? []) {
            timeline.push({
                id: String(i.id),
                type: String(i.channel),
                title: `${i.channel} ${i.direction}`,
                detail: String(i.content ?? '').slice(0, 200),
                at: String(i.created_at),
                atLabel: formatDateTime(i.created_at) ?? '',
            });
        }
        timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
        const crops = (cropsRes.data ?? []).map((c) => String(c.crop_type));
        const primaryCrop = crops[0] ?? '—';
        const nextTask = (tasksRes.data ?? []).find((t) => t.status === 'pending');
        const metadata = farmer?.metadata ?? {};
        return {
            lead,
            farmer: {
                id: farmerId,
                name: lead.farmerName,
                phone: lead.phone,
                email: null,
                district: lead.district,
                state: lead.state,
                language: farmer?.preferred_language ?? 'Hindi',
                territory: [lead.district, lead.state].filter(Boolean).join(', ') || '—',
                crop: primaryCrop,
                acreage: metadata.acreage ? String(metadata.acreage) : '—',
                farmSize: metadata.farmSize ? String(metadata.farmSize) : '—',
                irrigation: metadata.irrigation ? String(metadata.irrigation) : '—',
                soilType: metadata.soilType ? String(metadata.soilType) : 'Loamy',
                rating: lead.leadScore,
            },
            farmOverview: {
                totalBlocks: metadata.totalBlocks ?? 1,
                totalArea: metadata.totalArea ?? '—',
                primaryCrop,
                soilType: metadata.soilType ?? 'Loamy',
            },
            soilReport: {
                reportId: metadata.soilReportId ?? '—',
                date: metadata.soilReportDate ?? '—',
                health: metadata.soilHealth ?? 'Moderate',
                ph: metadata.soilPh ?? '6.8',
            },
            tasks: (tasksRes.data ?? []).map((t) => ({
                id: t.id,
                title: t.title,
                dueAt: t.due_at,
                dueLabel: formatDateTime(t.due_at),
                status: t.status,
                type: t.task_type,
            })),
            nextFollowUp: nextTask
                ? {
                    id: nextTask.id,
                    title: nextTask.title,
                    dueLabel: formatDateTime(nextTask.due_at),
                    notes: nextTask.notes,
                }
                : data.follow_up_at
                    ? {
                        id: null,
                        title: 'Scheduled follow-up',
                        dueLabel: formatDateTime(data.follow_up_at),
                        notes: data.notes,
                    }
                    : null,
            timeline: timeline.slice(0, 15),
            orders: orders.slice(0, 5).map((o) => ({
                id: o.id,
                label: o.order_name ?? 'Order',
                amount: Number(o.total_amount) || 0,
                date: formatDateTime(o.created_at),
            })),
            stages: Object.entries(STAGE_LABELS).map(([id, label]) => ({
                id,
                label,
                active: id === lead.stage,
                done: this.stageIndex(id) < this.stageIndex(lead.stage),
            })),
        };
    },
    stageIndex(stage) {
        const order = [
            'new_lead',
            'interested',
            'follow_up',
            'recommendation',
            'order_placed',
            'repeat_customer',
        ];
        return order.indexOf(stage);
    },
    async createLead(input, agentEmail) {
        const result = await leadService.createLead({
            phone: input.phone,
            name: input.name,
            intent: 'general',
            source: 'phone',
            notes: input.notes,
            cropType: input.cropType,
            district: input.district,
        });
        await supabase
            .from('leads')
            .update({
            assigned_to: agentEmail,
            stage: 'new_lead',
            follow_up_at: new Date(Date.now() + 86400000).toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq('id', result.lead.id);
        if (input.state) {
            await supabase.from('farmers').update({ state: input.state }).eq('id', result.farmer.id);
        }
        return this.getLeadDetail(result.lead.id);
    },
    async updateLead(leadId, patch, agentEmail) {
        const updates = { updated_at: new Date().toISOString() };
        if (patch.stage)
            updates.stage = patch.stage;
        if (patch.notes !== undefined)
            updates.notes = patch.notes;
        if (patch.followUpAt !== undefined)
            updates.follow_up_at = patch.followUpAt;
        if (patch.assignedTo !== undefined)
            updates.assigned_to = patch.assignedTo;
        if (patch.priority)
            updates.priority = patch.priority;
        const { data, error } = await supabase
            .from('leads')
            .update(updates)
            .eq('id', leadId)
            .select('farmer_id, stage')
            .single();
        if (error || !data)
            throw new NotFoundError('Lead not found');
        if (patch.stage) {
            await logInteraction(data.farmer_id, 'crm', `Lead stage updated to ${STAGE_LABELS[patch.stage] ?? patch.stage} by ${agentEmail}`);
        }
        await touchLead(leadId, data.farmer_id);
        return this.getLeadDetail(leadId);
    },
    async addNote(leadId, note, agentEmail) {
        const { data } = await supabase.from('leads').select('farmer_id, notes').eq('id', leadId).single();
        if (!data)
            throw new NotFoundError('Lead not found');
        const merged = [data.notes, note].filter(Boolean).join('\n');
        await supabase
            .from('leads')
            .update({ notes: merged, updated_at: new Date().toISOString() })
            .eq('id', leadId);
        await logInteraction(data.farmer_id, 'note', `${agentEmail}: ${note}`);
        await touchLead(leadId, data.farmer_id);
        return this.getLeadDetail(leadId);
    },
    async createTask(leadId, input, agentEmail) {
        const { data: lead } = await supabase.from('leads').select('farmer_id').eq('id', leadId).single();
        if (!lead)
            throw new NotFoundError('Lead not found');
        const { data, error } = await supabase
            .from('crm_tasks')
            .insert({
            farmer_id: lead.farmer_id,
            lead_id: leadId,
            assigned_to: agentEmail,
            title: input.title,
            notes: input.notes,
            due_at: input.dueAt ?? new Date(Date.now() + 86400000).toISOString(),
            task_type: input.taskType ?? 'follow_up',
        })
            .select()
            .single();
        throwIfSupabaseError(error, 'Could not create task');
        if (input.dueAt) {
            await supabase.from('leads').update({ follow_up_at: input.dueAt }).eq('id', leadId);
        }
        return data;
    },
    async completeTask(taskId) {
        const { error } = await supabase
            .from('crm_tasks')
            .update({
            status: 'done',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq('id', taskId);
        throwIfSupabaseError(error, 'Could not complete task');
    },
    async logCall(leadId, input, agentEmail) {
        const { data: lead } = await supabase.from('leads').select('farmer_id').eq('id', leadId).single();
        if (!lead)
            throw new NotFoundError('Lead not found');
        const { error } = await supabase.from('crm_call_logs').insert({
            farmer_id: lead.farmer_id,
            lead_id: leadId,
            agent_email: agentEmail,
            direction: 'outbound',
            outcome: input.outcome ?? 'completed',
            duration_seconds: input.durationSeconds ?? 0,
            notes: input.notes,
        });
        throwIfSupabaseError(error, 'Could not log call');
        await logInteraction(lead.farmer_id, 'call', `Call: ${input.outcome ?? 'completed'}${input.notes ? ` — ${input.notes}` : ''}`);
        await touchLead(leadId, lead.farmer_id);
        return this.getLeadDetail(leadId);
    },
    async listTasks(agentEmail, status = 'pending') {
        const { data, error } = await supabase
            .from('crm_tasks')
            .select('*, farmers(name, first_name, last_name, phone), leads(stage)')
            .or(`assigned_to.eq.${agentEmail},assigned_to.is.null`)
            .eq('status', status)
            .order('due_at', { ascending: true })
            .limit(100);
        throwIfSupabaseError(error, 'Could not load tasks');
        return (data ?? []).map((t) => {
            const farmer = t.farmers;
            const name = farmer ? displayFarmerName(farmer) : 'Farmer';
            return {
                id: t.id,
                title: t.title,
                dueLabel: formatDateTime(t.due_at),
                status: t.status,
                farmerName: name,
                phone: farmer?.phone,
                leadId: t.lead_id,
                stage: t.leads?.stage,
            };
        });
    },
    async listCalls(agentEmail, limit = 50) {
        let q = supabase
            .from('crm_call_logs')
            .select('*, farmers(name, first_name, last_name, phone)')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (agentEmail)
            q = q.eq('agent_email', agentEmail);
        const { data, error } = await q;
        throwIfSupabaseError(error, 'Could not load calls');
        return (data ?? []).map((c) => {
            const farmer = c.farmers;
            return {
                id: c.id,
                farmerName: farmer ? displayFarmerName(farmer) : 'Farmer',
                phone: farmer?.phone,
                outcome: c.outcome,
                durationSeconds: c.duration_seconds,
                agentEmail: c.agent_email,
                atLabel: formatDateTime(c.created_at),
                notes: c.notes,
            };
        });
    },
    async listWhatsAppThreads(limit = 30) {
        const { data, error } = await supabase
            .from('interaction_logs')
            .select('farmer_id, channel, content, direction, created_at, farmers(name, first_name, last_name, phone)')
            .eq('channel', 'whatsapp')
            .order('created_at', { ascending: false })
            .limit(200);
        throwIfSupabaseError(error, 'Could not load WhatsApp threads');
        const byFarmer = new Map();
        for (const row of data ?? []) {
            const fid = String(row.farmer_id);
            if (!byFarmer.has(fid)) {
                const rawFarmer = row.farmers;
                const farmer = (Array.isArray(rawFarmer) ? rawFarmer[0] : rawFarmer);
                byFarmer.set(fid, {
                    farmerId: fid,
                    farmerName: farmer ? displayFarmerName(farmer) : 'Farmer',
                    phone: farmer?.phone,
                    lastMessage: String(row.content ?? '').slice(0, 120),
                    lastAt: formatDateTime(row.created_at),
                    direction: row.direction,
                });
            }
        }
        return [...byFarmer.values()].slice(0, limit);
    },
    async getWhatsAppMessages(farmerId) {
        const { data, error } = await supabase
            .from('interaction_logs')
            .select('id, channel, direction, content, message_type, created_at')
            .eq('farmer_id', farmerId)
            .eq('channel', 'whatsapp')
            .order('created_at', { ascending: true })
            .limit(100);
        throwIfSupabaseError(error, 'Could not load messages');
        return (data ?? []).map((m) => ({
            id: m.id,
            direction: m.direction,
            content: m.content,
            atLabel: formatDateTime(m.created_at),
            createdAt: m.created_at,
        }));
    },
    async sendWhatsAppMessage(farmerId, text, agentEmail) {
        const { data: farmer, error } = await supabase
            .from('farmers')
            .select('phone')
            .eq('id', farmerId)
            .single();
        if (error || !farmer?.phone)
            throw new NotFoundError('Farmer phone not found');
        const phone = String(farmer.phone).replace(/\D/g, '');
        const to = phone.length === 10 ? `91${phone}` : phone;
        let sent = false;
        try {
            await whatsappService.sendText(to, text);
            sent = true;
        }
        catch {
            /* CRM still logs outbound when WhatsApp provider is not configured */
        }
        await supabase.from('interaction_logs').insert({
            farmer_id: farmerId,
            channel: 'whatsapp',
            direction: 'outbound',
            message_type: 'text',
            content: text,
        });
        await logInteraction(farmerId, 'whatsapp', `${sent ? 'Sent' : 'Queued'} by ${agentEmail}: ${text.slice(0, 80)}`);
        return { messages: await this.getWhatsAppMessages(farmerId), sent };
    },
};
//# sourceMappingURL=telecaller-admin.service.js.map