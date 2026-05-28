import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { shopifyProductsService } from '../shopify/shopify.products.service.js';
import { crmInternalNotesService } from './crm-internal-notes.service.js';
import { recommendationFollowUpService } from '../core/recommendation-follow-up.service.js';
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
function daysAfterPlanting(date) {
    if (!date)
        return null;
    const d = new Date(date);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    return diff >= 0 ? diff : null;
}
export const crmFarmerService = {
    async listMasters(type, parentId, search) {
        let q = supabase
            .from('crm_masters')
            .select('id, master_type, name, parent_id, category, description, active, sort_order')
            .eq('master_type', type)
            .eq('active', true)
            .order('sort_order')
            .order('name');
        if (parentId)
            q = q.eq('parent_id', parentId);
        else
            q = q.is('parent_id', null);
        if (search?.trim())
            q = q.ilike('name', `%${search.trim()}%`);
        const { data, error } = await q.limit(200);
        throwIfSupabaseError(error, 'Could not load masters');
        return data ?? [];
    },
    async createMaster(input) {
        const { data, error } = await supabase
            .from('crm_masters')
            .insert({
            master_type: input.masterType,
            name: input.name.trim(),
            parent_id: input.parentId ?? null,
            category: input.category,
            description: input.description,
        })
            .select()
            .single();
        throwIfSupabaseError(error, 'Could not create master');
        return data;
    },
    async updateMaster(id, patch) {
        const updates = { updated_at: new Date().toISOString() };
        if (patch.name != null)
            updates.name = patch.name.trim();
        if (patch.active != null)
            updates.active = patch.active;
        if (patch.description != null)
            updates.description = patch.description;
        const { data, error } = await supabase.from('crm_masters').update(updates).eq('id', id).select().single();
        throwIfSupabaseError(error, 'Could not update master');
        return data;
    },
    async listBlocks(farmerId) {
        const { data, error } = await supabase
            .from('farm_blocks')
            .select('*')
            .eq('farmer_id', farmerId)
            .is('archived_at', null)
            .order('name');
        throwIfSupabaseError(error, 'Could not load blocks');
        return (data ?? []).map(mapBlock);
    },
    async getBlock(blockId) {
        const { data, error } = await supabase.from('farm_blocks').select('*').eq('id', blockId).single();
        if (error || !data)
            throw new NotFoundError('Block not found');
        return mapBlock(data);
    },
    async createBlock(farmerId, input) {
        const { data, error } = await supabase
            .from('farm_blocks')
            .insert({
            farmer_id: farmerId,
            name: input.name,
            area: input.area,
            crop_id: input.cropId,
            crop_name: input.cropName,
            variety_id: input.varietyId,
            variety_name: input.varietyName,
            irrigation_type_id: input.irrigationTypeId,
            soil_type_id: input.soilTypeId,
            planting_date: input.plantingDate,
            spacing: input.spacing,
        })
            .select()
            .single();
        throwIfSupabaseError(error, 'Could not create block');
        return mapBlock(data);
    },
    async updateBlock(blockId, patch) {
        const allowed = [
            'name',
            'area',
            'crop_id',
            'crop_name',
            'variety_id',
            'variety_name',
            'irrigation_type_id',
            'soil_type_id',
            'growth_stage_id',
            'block_status_id',
            'planting_date',
            'spacing',
            'soil_health',
            'growth_percent',
            'last_visit_at',
        ];
        const updates = { updated_at: new Date().toISOString() };
        for (const k of allowed) {
            if (patch[k] !== undefined)
                updates[k] = patch[k];
        }
        if (patch.archived === true)
            updates.archived_at = new Date().toISOString();
        const { data, error } = await supabase
            .from('farm_blocks')
            .update(updates)
            .eq('id', blockId)
            .select()
            .single();
        throwIfSupabaseError(error, 'Could not update block');
        return mapBlock(data);
    },
    async getBlockWorkspace(farmerId, blockId) {
        const block = await this.getBlock(blockId);
        if (block.farmerId !== farmerId)
            throw new NotFoundError('Block not found');
        const [soilRes, findingsRes, recsRes, soilList, visits, blockRecs, followUps] = await Promise.all([
            supabase
                .from('crm_soil_reports')
                .select('*')
                .eq('block_id', blockId)
                .order('reported_at', { ascending: false })
                .limit(1),
            supabase
                .from('crm_field_findings')
                .select('*')
                .eq('block_id', blockId)
                .is('archived_at', null)
                .order('visited_at', { ascending: false })
                .limit(1),
            supabase
                .from('crm_recommendations')
                .select('*')
                .eq('block_id', blockId)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(3),
            this.listSoilReports(farmerId, blockId),
            this.listFieldFindingsForBlock(farmerId, blockId, 15),
            this.listRecommendationsForBlock(farmerId, blockId),
            this.listBlockFollowUps(farmerId, blockId),
        ]);
        const latestSoil = soilRes.data?.[0];
        const latestVisit = findingsRes.data?.[0];
        const recommendations = recsRes.data ?? [];
        return {
            block,
            soilReports: soilList.map((s) => ({
                id: s.id,
                reportedLabel: formatDateTime(s.reported_at),
                metrics: s.metrics,
                pdfUrl: s.pdf_url,
            })),
            visits,
            blockRecommendations: blockRecs,
            followUps,
            blockInfo: {
                blockName: block.name,
                area: block.area,
                crop: block.cropName,
                variety: block.varietyName,
                plantingDate: block.plantingDate,
                daysAfterPlanting: daysAfterPlanting(String(block.plantingDate ?? '')),
                irrigationType: block.irrigationTypeName,
                spacing: block.spacing,
                growthStage: block.growthStageName,
                growthPercent: block.growthPercent,
                nextStage: 'Flowering',
            },
            soilReport: latestSoil
                ? { metrics: latestSoil.metrics, pdfUrl: latestSoil.pdf_url, reportedLabel: formatDateTime(latestSoil.reported_at) }
                : defaultSoilMetrics(),
            latestVisit: latestVisit ? mapFinding(latestVisit) : null,
            recommendations: recommendations.map(mapRecommendation),
            timeline: await this.blockTimeline(farmerId, blockId),
        };
    },
    async blockTimeline(farmerId, blockId) {
        const items = [];
        const recEvents = await recommendationFollowUpService.buildBlockTimelineEvents(blockId, farmerId);
        for (const e of recEvents) {
            items.push({
                title: e.title,
                at: e.at,
                atLabel: formatDateTime(e.at) ?? '',
                kind: e.kind,
                detail: e.detail,
            });
        }
        const { data: findings } = await supabase
            .from('crm_field_findings')
            .select('visited_at, observations')
            .eq('block_id', blockId)
            .order('visited_at', { ascending: false })
            .limit(5);
        for (const f of findings ?? []) {
            items.push({
                title: 'Field visit completed',
                at: String(f.visited_at),
                atLabel: formatDateTime(f.visited_at) ?? '',
            });
        }
        const { data: recs } = await supabase
            .from('crm_recommendations')
            .select('created_at, recommendation')
            .eq('block_id', blockId)
            .order('created_at', { ascending: false })
            .limit(3);
        for (const r of recs ?? []) {
            items.push({
                title: 'Recommendation given',
                at: String(r.created_at),
                atLabel: formatDateTime(r.created_at) ?? '',
            });
        }
        items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
        return items.slice(0, 8);
    },
    async listSoilReports(farmerId, blockId) {
        let q = supabase
            .from('crm_soil_reports')
            .select('*')
            .eq('farmer_id', farmerId)
            .order('reported_at', { ascending: false });
        if (blockId)
            q = q.eq('block_id', blockId);
        const { data, error } = await q.limit(20);
        throwIfSupabaseError(error, 'Could not load soil reports');
        return data ?? [];
    },
    async createSoilReport(farmerId, input) {
        const { data, error } = await supabase
            .from('crm_soil_reports')
            .insert({
            farmer_id: farmerId,
            block_id: input.blockId,
            metrics: input.metrics ?? defaultSoilMetrics().metrics,
            pdf_url: input.pdfUrl,
            uploaded_by: input.uploadedBy,
        })
            .select()
            .single();
        throwIfSupabaseError(error, 'Could not save soil report');
        return data;
    },
    async listRecommendations(farmerId, page = 1, limit = 10) {
        const from = (page - 1) * limit;
        const { data, error, count } = await supabase
            .from('crm_recommendations')
            .select('*, farm_blocks(name, crop_name)', { count: 'exact' })
            .eq('farmer_id', farmerId)
            .order('created_at', { ascending: false })
            .range(from, from + limit - 1);
        throwIfSupabaseError(error, 'Could not load recommendations');
        return {
            recommendations: (data ?? []).map((r) => mapRecommendation(r)),
            pagination: { page, limit, total: count ?? 0, pages: Math.max(1, Math.ceil((count ?? 0) / limit)) },
        };
    },
    async createRecommendation(farmerId, leadId, input) {
        const { data, error } = await supabase
            .from('crm_recommendations')
            .insert({
            farmer_id: farmerId,
            lead_id: leadId,
            block_id: input.blockId,
            rec_type: input.recType ?? 'agronomist',
            problem: input.problem,
            recommendation: input.recommendation,
            products: input.products ?? [],
            dosage: input.dosage,
            application_method: input.applicationMethod,
            follow_up_at: input.followUpAt,
            recommended_by: input.recommendedBy,
            status: 'active',
        })
            .select()
            .single();
        throwIfSupabaseError(error, 'Could not create recommendation');
        return mapRecommendation(data);
    },
    async listInteractions(farmerId, page = 1, limit = 10) {
        const from = (page - 1) * limit;
        const { data, error, count } = await supabase
            .from('interaction_logs')
            .select('*', { count: 'exact' })
            .eq('farmer_id', farmerId)
            .order('created_at', { ascending: false })
            .range(from, from + limit - 1);
        throwIfSupabaseError(error, 'Could not load interactions');
        return {
            interactions: (data ?? []).map(mapInteraction),
            pagination: { page, limit, total: count ?? 0, pages: Math.max(1, Math.ceil((count ?? 0) / limit)) },
        };
    },
    async createInteraction(farmerId, leadId, input) {
        const channel = input.channel ??
            (input.interactionType.toLowerCase().includes('whatsapp')
                ? 'whatsapp'
                : input.interactionType.toLowerCase().includes('call')
                    ? 'call'
                    : 'note');
        const { data, error } = await supabase
            .from('interaction_logs')
            .insert({
            farmer_id: farmerId,
            lead_id: leadId,
            block_id: input.blockId,
            channel,
            direction: 'outbound',
            interaction_type: input.interactionType,
            done_by: input.doneBy,
            done_by_role: input.doneByRole,
            summary: input.summary ?? input.notes,
            content: input.notes ?? input.summary,
            next_action: input.nextAction,
            next_action_at: input.nextActionAt,
            status: input.status ?? 'completed',
        })
            .select()
            .single();
        throwIfSupabaseError(error, 'Could not create interaction');
        return mapInteraction(data);
    },
    async getAgronomist(farmerId) {
        const { data } = await supabase
            .from('farmer_agronomist_assignments')
            .select('*')
            .eq('farmer_id', farmerId)
            .eq('status', 'active')
            .maybeSingle();
        const base = data ? mapAgronomist(data, farmerId) : defaultAgronomist(farmerId);
        const blocks = await this.listBlocks(farmerId).catch(() => []);
        const { data: findings } = await supabase
            .from('crm_field_findings')
            .select('visited_at, observations, block_name')
            .eq('farmer_id', farmerId)
            .order('visited_at', { ascending: false })
            .limit(6);
        base.blocks = blocks.map((b) => ({
            block: String(b.name),
            crop: String(b.cropName),
            area: String(b.area),
            status: b.soilHealth === 'good' ? 'Healthy' : 'Under Monitoring',
            statusTone: String(b.soilTone),
        }));
        base.activities = (findings ?? []).map((f) => ({
            date: formatDateTime(f.visited_at)?.split(',')[0] ?? '—',
            activity: 'Field Visit',
            activityTone: 'success',
            block: f.block_name ?? '—',
            notes: String(f.observations ?? '').slice(0, 80),
        }));
        base.assignedBlocks = blocks.map((b) => b.name).join(', ') || '—';
        return base;
    },
    async upsertAgronomist(farmerId, input) {
        const existing = await supabase
            .from('farmer_agronomist_assignments')
            .select('id')
            .eq('farmer_id', farmerId)
            .eq('status', 'active')
            .maybeSingle();
        const payload = {
            farmer_id: farmerId,
            agronomist_name: input.agronomistName ?? 'Arjun Nair',
            employee_id: input.employeeId ?? 'AGRO-1001',
            mobile: input.mobile,
            email: input.email,
            specialization: input.specialization ?? 'Soil Nutrition',
            next_visit_at: input.nextVisitAt,
            status: 'active',
            updated_at: new Date().toISOString(),
        };
        if (existing.data?.id) {
            const { data, error } = await supabase
                .from('farmer_agronomist_assignments')
                .update(payload)
                .eq('id', existing.data.id)
                .select()
                .single();
            throwIfSupabaseError(error, 'Could not update agronomist');
            return mapAgronomist(data, farmerId);
        }
        const { data, error } = await supabase
            .from('farmer_agronomist_assignments')
            .insert({ ...payload, assigned_since: new Date().toISOString().slice(0, 10) })
            .select()
            .single();
        throwIfSupabaseError(error, 'Could not assign agronomist');
        return mapAgronomist(data, farmerId);
    },
    async ensureDemoCrmData(farmerId, leadId, agentEmail) {
        const blocks = await this.ensureDemoBlocks(farmerId);
        const blockId = blocks[0]?.id;
        const { count: recCount } = await supabase
            .from('crm_recommendations')
            .select('id', { count: 'exact', head: true })
            .eq('farmer_id', farmerId);
        if (!recCount && typeof blockId === 'string') {
            await this.createRecommendation(farmerId, leadId, {
                blockId: blockId,
                problem: 'Nutrient deficiency on lower leaves',
                recommendation: 'Potassium Nitrate foliar spray — 5g/L',
                applicationMethod: 'Foliar Spray',
                recommendedBy: agentEmail ?? 'Agronomist',
                recType: 'agronomist',
            });
        }
        const ix = await this.listInteractions(farmerId, 1, 1);
        if (!ix.pagination.total) {
            await this.createInteraction(farmerId, leadId, {
                interactionType: 'Call',
                summary: 'Initial outreach — farmer interested in nutrition schedule.',
                doneBy: agentEmail ?? 'Telecaller',
                doneByRole: 'Telecaller',
                status: 'completed',
            });
        }
        if (typeof blockId === 'string') {
            const { count: soilCount } = await supabase
                .from('crm_soil_reports')
                .select('id', { count: 'exact', head: true })
                .eq('block_id', blockId);
            if (!soilCount) {
                await this.createSoilReport(farmerId, { blockId: blockId, uploadedBy: agentEmail });
            }
        }
        return blocks;
    },
    async getFarmerCrmBundle(farmerId, leadId, agentEmail) {
        await this.ensureDemoCrmData(farmerId, leadId, agentEmail);
        const [blocks, agronomist, interactions, recommendations, orders, internalNotes] = await Promise.all([
            this.listBlocks(farmerId),
            this.getAgronomist(farmerId),
            this.listInteractions(farmerId, 1, 10),
            this.listRecommendations(farmerId, 1, 10),
            this.listFarmerOrders(farmerId),
            crmInternalNotesService.list(farmerId),
        ]);
        return { blocks, agronomist, interactions, recommendations, orders, internalNotes };
    },
    async listFarmerOrders(farmerId) {
        const manual = await this.listManualOrders(farmerId);
        const { data: farmer } = await supabase.from('farmers').select('phone').eq('id', farmerId).single();
        const phone = String(farmer?.phone ?? '').replace(/\D/g, '').slice(-10);
        const commerce = [];
        if (phone) {
            const { data } = await supabase
                .from('commerce_orders')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            for (const o of (data ?? []).filter((row) => String(row.phone ?? '').replace(/\D/g, '').slice(-10) === phone).slice(0, 20)) {
                commerce.push({
                    id: o.order_name ?? o.id,
                    orderRef: o.order_name,
                    dateLabel: formatDateTime(o.created_at),
                    product: o.order_name ?? 'Order',
                    qty: 1,
                    amount: Number(o.total_amount) || 0,
                    status: 'Delivered',
                    statusTone: 'success',
                    payment: 'Paid Online',
                    deliveryDate: formatDateTime(o.created_at) ?? '—',
                    deliveryBy: 'Courier',
                    block: '—',
                    source: 'commerce',
                });
            }
        }
        const orders = [...manual, ...commerce].sort((a, b) => new Date(String(b.dateLabel)).getTime() - new Date(String(a.dateLabel)).getTime());
        return { orders };
    },
    async ensureDemoBlocks(farmerId) {
        const existing = await this.listBlocks(farmerId);
        if (existing.length)
            return existing;
        const crops = await this.listMasters('crop');
        const banana = crops.find((c) => c.name === 'Banana') ?? crops[0];
        const pepper = crops.find((c) => c.name === 'Pepper') ?? crops[1];
        await this.createBlock(farmerId, {
            name: 'Block A',
            area: '2.1 Acre',
            cropId: banana?.id,
            cropName: banana?.name ?? 'Banana',
            varietyName: 'Nendran',
            plantingDate: '2024-01-12',
        });
        if (pepper) {
            await this.createBlock(farmerId, {
                name: 'Block B',
                area: '1.5 Acre',
                cropId: pepper.id,
                cropName: pepper.name,
                varietyName: 'Panniyur-1',
                plantingDate: '2024-02-01',
            });
        }
        return this.listBlocks(farmerId);
    },
    async listInteractionsFiltered(farmerId, filters, page = 1, limit = 10) {
        const from = (page - 1) * limit;
        let q = supabase
            .from('interaction_logs')
            .select('*', { count: 'exact' })
            .eq('farmer_id', farmerId)
            .order('created_at', { ascending: false });
        if (filters.type)
            q = q.ilike('interaction_type', `%${filters.type}%`);
        if (filters.status)
            q = q.eq('status', filters.status);
        if (filters.blockId)
            q = q.eq('block_id', filters.blockId);
        q = q.or('status.is.null,status.neq.archived');
        const { data, error, count } = await q.range(from, from + limit - 1);
        throwIfSupabaseError(error, 'Could not load interactions');
        return {
            interactions: (data ?? []).map(mapInteraction),
            pagination: { page, limit, total: count ?? 0, pages: Math.max(1, Math.ceil((count ?? 0) / limit)) },
        };
    },
    async updateInteraction(id, patch) {
        const allowed = ['interaction_type', 'summary', 'content', 'next_action', 'next_action_at', 'status', 'block_id'];
        const updates = {};
        for (const k of allowed) {
            if (patch[k] !== undefined)
                updates[k] = patch[k];
        }
        const { data, error } = await supabase.from('interaction_logs').update(updates).eq('id', id).select().single();
        throwIfSupabaseError(error, 'Could not update interaction');
        return mapInteraction(data);
    },
    async archiveInteraction(id) {
        return this.updateInteraction(id, { status: 'archived' });
    },
    async updateRecommendation(id, patch) {
        const allowed = ['problem', 'recommendation', 'dosage', 'application_method', 'follow_up_at', 'status', 'products'];
        const updates = { updated_at: new Date().toISOString() };
        for (const k of allowed) {
            if (patch[k] !== undefined)
                updates[k] = patch[k];
        }
        const { data, error } = await supabase.from('crm_recommendations').update(updates).eq('id', id).select('*, farm_blocks(name, crop_name)').single();
        throwIfSupabaseError(error, 'Could not update recommendation');
        return mapRecommendation(data);
    },
    async archiveRecommendation(id) {
        return this.updateRecommendation(id, { status: 'archived' });
    },
    async listFieldFindingsForBlock(farmerId, blockId, limit = 20) {
        const { data, error } = await supabase
            .from('crm_field_findings')
            .select('*')
            .eq('farmer_id', farmerId)
            .eq('block_id', blockId)
            .is('archived_at', null)
            .order('visited_at', { ascending: false })
            .limit(limit);
        throwIfSupabaseError(error, 'Could not load visits');
        return (data ?? []).map((r) => ({
            id: r.id,
            visitedLabel: formatDateTime(r.visited_at),
            agronomistName: r.agronomist_name,
            diseasePest: r.disease_pest,
            observations: r.observations,
            spad: (r.parameters ?? []).find((p) => p.label === 'SPAD')?.value,
        }));
    },
    async archiveFieldFinding(id) {
        const { error } = await supabase
            .from('crm_field_findings')
            .update({ archived_at: new Date().toISOString() })
            .eq('id', id);
        throwIfSupabaseError(error, 'Could not archive field finding');
        return { ok: true };
    },
    async listRecommendationsForBlock(farmerId, blockId) {
        const { data, error } = await supabase
            .from('crm_recommendations')
            .select('*, farm_blocks(name, crop_name)')
            .eq('farmer_id', farmerId)
            .eq('block_id', blockId)
            .neq('status', 'archived')
            .order('created_at', { ascending: false })
            .limit(20);
        throwIfSupabaseError(error, 'Could not load recommendations');
        return (data ?? []).map(mapRecommendation);
    },
    async listBlockFollowUps(farmerId, blockId) {
        let q = supabase
            .from('crm_tasks')
            .select('*')
            .eq('farmer_id', farmerId)
            .eq('status', 'pending')
            .order('due_at', { ascending: true })
            .limit(20);
        if (blockId)
            q = q.eq('block_id', blockId);
        const { data, error } = await q;
        throwIfSupabaseError(error, 'Could not load follow-ups');
        return (data ?? []).map((t) => ({
            id: t.id,
            title: t.title,
            dueLabel: formatDateTime(t.due_at),
            taskType: t.task_type,
            notes: t.notes,
        }));
    },
    async scheduleVisit(farmerId, leadId, input) {
        const due = new Date(input.dueAt);
        if (Number.isNaN(due.getTime()))
            throw new ValidationError('Invalid visit date');
        const title = input.title?.trim() || 'Field visit';
        const { data, error } = await supabase
            .from('crm_tasks')
            .insert({
            farmer_id: farmerId,
            lead_id: leadId,
            block_id: input.blockId ?? null,
            assigned_to: input.assignedTo,
            task_type: 'visit',
            title,
            notes: input.notes,
            due_at: due.toISOString(),
            status: 'pending',
        })
            .select()
            .single();
        throwIfSupabaseError(error, 'Could not schedule visit');
        const ics = buildIcsEvent({
            uid: String(data.id),
            title,
            start: due,
            description: input.notes ?? 'Scheduled from Morbeez CRM',
        });
        return { task: data, icsContent: ics, icsFilename: 'morbeez-visit.ics' };
    },
    async createManualOrder(farmerId, leadId, input) {
        if (!input.lineItems?.length)
            throw new ValidationError('Add at least one product');
        const total = input.lineItems.reduce((s, li) => s + li.price * li.quantity, 0);
        const orderRef = `CRM-${Date.now().toString(36).toUpperCase()}`;
        const { data, error } = await supabase
            .from('crm_manual_orders')
            .insert({
            farmer_id: farmerId,
            lead_id: leadId,
            block_id: input.blockId,
            recommendation_id: input.recommendationId,
            order_ref: orderRef,
            line_items: input.lineItems,
            payment_mode: input.paymentMode,
            delivery_address: input.deliveryAddress,
            total_amount: total,
            notes: input.notes,
            created_by: input.createdBy,
            status: 'pending',
        })
            .select()
            .single();
        throwIfSupabaseError(error, 'Could not create order');
        return mapManualOrder(data);
    },
    async convertRecommendationToOrder(recommendationId, farmerId, leadId, createdBy) {
        const { data: rec, error } = await supabase
            .from('crm_recommendations')
            .select('*')
            .eq('id', recommendationId)
            .eq('farmer_id', farmerId)
            .single();
        if (error || !rec)
            throw new NotFoundError('Recommendation not found');
        const products = rec.products ?? [];
        const lineItems = products.length > 0
            ? products.map((p) => ({
                title: p.title ?? 'Product',
                quantity: p.quantity ?? 1,
                price: p.price ?? 0,
            }))
            : [{ title: String(rec.recommendation).slice(0, 120), quantity: 1, price: 0 }];
        const order = await this.createManualOrder(farmerId, leadId, {
            blockId: rec.block_id,
            recommendationId,
            lineItems,
            notes: `Converted from recommendation: ${rec.problem ?? ''}`,
            createdBy,
        });
        await this.updateRecommendation(recommendationId, { status: 'converted' });
        return order;
    },
    async listManualOrders(farmerId) {
        const { data, error } = await supabase
            .from('crm_manual_orders')
            .select('*')
            .eq('farmer_id', farmerId)
            .order('created_at', { ascending: false })
            .limit(30);
        throwIfSupabaseError(error, 'Could not load CRM orders');
        return (data ?? []).map(mapManualOrder);
    },
    async getOrderCatalog(search) {
        const catalog = await shopifyProductsService.getInventoryCatalog(search);
        return catalog.slice(0, 80).flatMap((p) => (p.variants ?? []).map((v) => ({
            productId: p.id,
            variantId: v.id,
            title: `${p.title} — ${v.title}`,
            sku: v.sku,
            price: Number(v.price) || 0,
            stock: v.inventory,
        })));
    },
    buildExportHtml(_type, payload) {
        const title = String(payload.title ?? 'Morbeez CRM Export');
        const rows = payload.rows ?? [];
        const tableRows = payload.table?.rows
            ?.map((r) => `<tr>${r.map((c) => `<td style="border:1px solid #ddd;padding:6px">${escapeHtmlExport(c)}</td>`).join('')}</tr>`)
            .join('') ?? '';
        const tableHead = payload.table?.cols
            ?.map((c) => `<th style="border:1px solid #ddd;padding:6px;text-align:left">${escapeHtmlExport(c)}</th>`)
            .join('') ?? '';
        return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtmlExport(title)}</title>
<style>body{font-family:Inter,sans-serif;padding:24px;color:#1a1a1a}h1{font-size:20px}dl{display:grid;grid-template-columns:160px 1fr;gap:8px}dt{font-weight:600;color:#555}table{border-collapse:collapse;width:100%;margin-top:16px}@media print{.no-print{display:none}}</style></head>
<body><h1>${escapeHtmlExport(title)}</h1><p class="no-print"><button onclick="window.print()">Print / Save as PDF</button></p>
<dl>${rows.map((r) => `<dt>${escapeHtmlExport(r.label)}</dt><dd>${escapeHtmlExport(r.value)}</dd>`).join('')}</dl>
${tableHead ? `<table><thead><tr>${tableHead}</tr></thead><tbody>${tableRows}</tbody></table>` : ''}
<p style="margin-top:24px;color:#888;font-size:12px">Generated ${new Date().toLocaleString('en-IN')}</p></body></html>`;
    },
    buildWhatsAppMessage(type, payload, phone) {
        let text = '';
        if (type === 'recommendation') {
            text = `🌾 *Morbeez Recommendation*\n\n*Problem:* ${payload.problem ?? '—'}\n*Advice:* ${payload.recommendation ?? '—'}\n*Dosage:* ${payload.dosage ?? '—'}\n\nContact your agronomist for details.`;
        }
        else if (type === 'lead') {
            text = `🌾 *Farmer profile — ${payload.name ?? 'Farmer'}*\nPhone: ${payload.phone ?? '—'}\nCrop: ${payload.crop ?? '—'}\nTerritory: ${payload.territory ?? '—'}`;
        }
        else {
            text = String(payload.text ?? 'Shared from Morbeez CRM');
        }
        const digits = String(phone ?? '').replace(/\D/g, '').slice(-10);
        const url = digits ? `https://wa.me/91${digits}?text=${encodeURIComponent(text)}` : null;
        return { text, url };
    },
};
function escapeHtmlExport(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
function buildIcsEvent(input) {
    const fmt = (d) => d
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, 'Z');
    const end = new Date(input.start.getTime() + 60 * 60 * 1000);
    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Morbeez CRM//EN',
        'BEGIN:VEVENT',
        `UID:${input.uid}@morbeez.com`,
        `DTSTAMP:${fmt(new Date())}`,
        `DTSTART:${fmt(input.start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:${input.title.replace(/\n/g, ' ')}`,
        `DESCRIPTION:${(input.description ?? '').replace(/\n/g, '\\n')}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n');
}
function mapManualOrder(r) {
    const items = r.line_items ?? [];
    return {
        id: r.order_ref ?? r.id,
        orderRef: r.order_ref,
        dateLabel: formatDateTime(r.created_at),
        product: items.map((i) => i.title).join(', ') || 'Order',
        qty: items.reduce((s, i) => s + (i.quantity || 1), 0),
        amount: Number(r.total_amount) || 0,
        status: r.status === 'fulfilled' ? 'Delivered' : r.status === 'confirmed' ? 'Confirmed' : 'Pending',
        statusTone: r.status === 'fulfilled' ? 'success' : 'info',
        payment: String(r.payment_mode ?? 'CRM'),
        deliveryDate: '—',
        deliveryBy: 'CRM',
        block: '—',
        source: 'crm_manual',
    };
}
function mapBlock(r) {
    const soilHealth = String(r.soil_health ?? 'good');
    return {
        id: r.id,
        farmerId: r.farmer_id,
        name: r.name,
        area: r.area ?? '—',
        cropName: r.crop_name ?? '—',
        varietyName: r.variety_name ?? '—',
        cropId: r.crop_id,
        varietyId: r.variety_id,
        irrigationTypeId: r.irrigation_type_id,
        soilTypeId: r.soil_type_id,
        growthStageId: r.growth_stage_id,
        growthStageName: 'Vegetative',
        irrigationTypeName: 'Drip',
        plantingDate: r.planting_date ?? null,
        spacing: r.spacing,
        soilHealth,
        soilTone: soilHealth === 'good' ? 'success' : soilHealth === 'medium' ? 'warning' : 'danger',
        lastVisit: formatDateTime(r.last_visit_at) ?? '—',
        growthPercent: r.growth_percent ?? 65,
        status: 'Active',
    };
}
function mapFinding(r) {
    return {
        agronomistName: r.agronomist_name,
        diseasePest: r.disease_pest,
        observations: r.observations,
        parameters: r.parameters,
        visitedLabel: formatDateTime(r.visited_at),
        spad: r.parameters?.find((p) => p.label === 'SPAD')?.value,
    };
}
function mapRecommendation(r) {
    const block = r.farm_blocks;
    return {
        id: r.id,
        recId: `REC-${String(r.id).slice(0, 8).toUpperCase()}`,
        dateLabel: formatDateTime(r.created_at),
        blockName: block?.name ?? '—',
        cropType: block?.crop_name ?? '—',
        problem: r.problem,
        recommendation: r.recommendation,
        products: r.products,
        dosage: r.dosage,
        applicationMethod: r.application_method,
        recommendedBy: r.recommended_by ?? 'Agronomist',
        status: r.status,
        statusTone: r.status === 'active' ? 'info' : r.status === 'completed' ? 'success' : 'warning',
        followUpLabel: formatDateTime(r.follow_up_at),
        recType: r.rec_type,
    };
}
function mapInteraction(r) {
    const type = String(r.interaction_type ?? r.channel ?? 'Note');
    const toneMap = {
        completed: 'success',
        delivered: 'success',
        sent: 'info',
        active: 'info',
        pending: 'warning',
        'under review': 'review',
    };
    const status = String(r.status ?? 'completed');
    return {
        id: r.id,
        atLabel: formatDateTime(r.created_at),
        type: type.toLowerCase(),
        typeLabel: type,
        icon: type.toLowerCase().includes('whatsapp') ? 'whatsapp' : type.toLowerCase().includes('call') ? 'phone' : 'ai',
        by: r.done_by ?? 'Staff',
        role: r.done_by_role ?? 'Telecaller',
        summary: r.summary ?? r.content ?? '',
        nextAction: r.next_action ?? '—',
        nextDate: formatDateTime(r.next_action_at) ?? '',
        status: status.charAt(0).toUpperCase() + status.slice(1),
        statusTone: toneMap[status.toLowerCase()] ?? 'success',
        block: '—',
    };
}
function mapAgronomist(r, farmerId) {
    return {
        name: r.agronomist_name,
        employeeId: r.employee_id,
        mobile: String(r.mobile ?? '+91 98765 43211'),
        email: String(r.email ?? 'arjun.nair@morbeez.com'),
        specialization: r.specialization,
        assignedSince: r.assigned_since,
        assignedBlocks: 'Block A, Block B',
        lastReview: formatDateTime(r.last_review_at),
        nextVisit: formatDateTime(r.next_visit_at)?.split(',')[0] ?? '—',
        activities: [],
        blocks: [],
        performance: [
            { label: 'Total Visits', value: '12', icon: '📅' },
            { label: 'Recommendations Given', value: '18', icon: '📋' },
            { label: 'Active Follow-ups', value: '5', icon: '✓' },
            { label: 'Recovery Success Rate', value: '92%', icon: '📈' },
        ],
        farmerId,
    };
}
function defaultAgronomist(farmerId) {
    return mapAgronomist({
        agronomist_name: 'Arjun Nair',
        employee_id: 'AGRO-1001',
        specialization: 'Soil Nutrition, Banana, Pepper',
        assigned_since: '2024-05-10',
        last_review_at: new Date().toISOString(),
        next_visit_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    }, farmerId);
}
function defaultSoilMetrics() {
    return {
        metrics: {
            ph: { value: '6.2', status: 'Good' },
            ec: { value: '0.42 dS/m', status: 'Normal' },
            organicCarbon: { value: '0.54%', status: 'Low' },
            nitrogen: { value: '245 kg/ha', status: 'Normal' },
            phosphorus: { value: '18 kg/ha', status: 'Good' },
            potassium: { value: '180 kg/ha', status: 'Good' },
        },
        reportedLabel: null,
        pdfUrl: null,
    };
}
//# sourceMappingURL=crm-farmer.service.js.map