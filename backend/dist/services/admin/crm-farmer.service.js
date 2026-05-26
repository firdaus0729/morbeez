import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError } from '../../lib/errors.js';
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
        const [soilRes, findingsRes, recsRes] = await Promise.all([
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
                .order('visited_at', { ascending: false })
                .limit(1),
            supabase
                .from('crm_recommendations')
                .select('*')
                .eq('block_id', blockId)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(3),
        ]);
        const latestSoil = soilRes.data?.[0];
        const latestVisit = findingsRes.data?.[0];
        const recommendations = recsRes.data ?? [];
        return {
            block,
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
    async blockTimeline(_farmerId, blockId) {
        const items = [];
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
        const [blocks, agronomist, interactions, recommendations, orders] = await Promise.all([
            this.listBlocks(farmerId),
            this.getAgronomist(farmerId),
            this.listInteractions(farmerId, 1, 10),
            this.listRecommendations(farmerId, 1, 10),
            this.listFarmerOrders(farmerId),
        ]);
        return { blocks, agronomist, interactions, recommendations, orders };
    },
    async listFarmerOrders(farmerId) {
        const { data: farmer } = await supabase.from('farmers').select('phone').eq('id', farmerId).single();
        const phone = String(farmer?.phone ?? '').replace(/\D/g, '').slice(-10);
        if (!phone)
            return { orders: [] };
        const { data } = await supabase
            .from('commerce_orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        const orders = (data ?? [])
            .filter((o) => String(o.phone ?? '').replace(/\D/g, '').slice(-10) === phone)
            .slice(0, 20)
            .map((o, i) => ({
            id: o.order_name ?? `ORD-${i}`,
            dateLabel: formatDateTime(o.created_at),
            product: o.order_name ?? 'Order',
            qty: 1,
            amount: Number(o.total_amount) || 0,
            status: 'Delivered',
            statusTone: 'success',
            payment: 'Paid Online',
            deliveryDate: formatDateTime(o.created_at),
            deliveryBy: 'Courier',
            block: 'Block A',
        }));
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
};
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