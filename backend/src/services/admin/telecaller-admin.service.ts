import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError } from '../../lib/errors.js';
import { leadService } from '../crm/lead.service.js';
import { whatsappService } from '../whatsapp/whatsapp.service.js';

export type LeadStage =
  | 'new_lead'
  | 'interested'
  | 'follow_up'
  | 'recommendation'
  | 'order_placed'
  | 'repeat_customer';

export interface TelecallerListQuery {
  scope?: 'mine' | 'all';
  stage?: string;
  search?: string;
  page?: number;
  limit?: number;
  assignedTo?: string;
}

const STAGE_LABELS: Record<LeadStage, string> = {
  new_lead: 'New Lead',
  interested: 'Interested',
  follow_up: 'Follow-up',
  recommendation: 'Recommendation',
  order_placed: 'Order Placed',
  repeat_customer: 'Repeat Customer',
};

function displayFarmerName(row: {
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): string {
  const first = String(row.first_name ?? '').trim();
  const last = String(row.last_name ?? '').trim();
  const combined = [first, last].filter(Boolean).join(' ');
  if (combined) return combined;
  return String(row.name ?? '').trim() || 'Farmer';
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'F'
  );
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits || null;
}

function formatDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function mapLeadRow(row: Record<string, unknown>) {
  const farmer = row.farmers as Record<string, unknown> | null;
  const name = farmer ? displayFarmerName(farmer) : 'Unknown';
  const stage = String(row.stage ?? 'new_lead') as LeadStage;
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
    followUpLabel: formatDateTime(row.follow_up_at as string),
    lastInteractionAt: row.last_interaction_at,
    lastInteractionLabel: formatDateTime(row.last_interaction_at as string),
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

async function logInteraction(
  farmerId: string,
  channel: string,
  content: string,
  direction: 'inbound' | 'outbound' = 'outbound'
) {
  await supabase.from('interaction_logs').insert({
    farmer_id: farmerId,
    channel,
    direction,
    message_type: 'note',
    content,
  });
}

async function touchLead(leadId: string, _farmerId: string) {
  const now = new Date().toISOString();
  await supabase
    .from('leads')
    .update({ last_interaction_at: now, updated_at: now })
    .eq('id', leadId);
  return now;
}

export const telecallerAdminService = {
  stageLabels: STAGE_LABELS,

  async getOverview(agentEmail: string) {
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
    const conversionRate =
      (myLeads ?? 0) > 0 ? Math.round(((ordersGenerated / (myLeads ?? 1)) * 100) * 10) / 10 : 0;

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

  async listLeads(query: TelecallerListQuery, agentEmail: string) {
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

    let rows = (data ?? []).map((r) => mapLeadRow(r as Record<string, unknown>));

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

  async getLeadDetail(leadId: string) {
    const { data, error } = await supabase
      .from('leads')
      .select(
        `*, farmers(
          id, phone, name, first_name, last_name, district, state, village,
          preferred_language, metadata, created_at, pincode_id,
          whatsapp_phone, whatsapp_same_as_phone, shipping_address, delivery_pincode,
          total_acreage, roi_enabled, farmer_notes, assigned_crop_advisor,
          pincode_master(pincode, district, state)
        )`
      )
      .eq('id', leadId)
      .single();

    if (error || !data) throw new NotFoundError('Lead not found');

    const lead = mapLeadRow(data as Record<string, unknown>);
    const farmer = data.farmers as Record<string, unknown>;

    const farmerId = String(data.farmer_id);

    const [cropsRes, tasksRes, callsRes, interactionsRes, ordersRes] = await Promise.all([
      supabase
        .from('farm_blocks')
        .select('id, crop_type, acreage, is_primary, name, plot_label, planting_date')
        .eq('farmer_id', farmerId)
        .order('is_primary', { ascending: false }),
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
    const orders = (ordersRes.data ?? []).filter(
      (o) => normalizePhone(String(o.phone)) === phoneKey
    );

    const timeline: {
      id: string;
      type: string;
      title: string;
      detail: string;
      at: string;
      atLabel: string;
    }[] = [];

    for (const c of callsRes.data ?? []) {
      timeline.push({
        id: String(c.id),
        type: 'call',
        title: `Call ${c.direction === 'inbound' ? 'received' : 'completed'}`,
        detail: String(c.outcome ?? c.notes ?? ''),
        at: String(c.created_at),
        atLabel: formatDateTime(c.created_at as string) ?? '',
      });
    }

    for (const i of interactionsRes.data ?? []) {
      timeline.push({
        id: String(i.id),
        type: String(i.channel),
        title: `${i.channel} ${i.direction}`,
        detail: String(i.content ?? '').slice(0, 200),
        at: String(i.created_at),
        atLabel: formatDateTime(i.created_at as string) ?? '',
      });
    }

    timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    const blocks = cropsRes.data ?? [];
    const crops = blocks.map((c) => String(c.crop_type));
    const primaryCrop = crops[0] ?? '—';
    const nextTask = (tasksRes.data ?? []).find((t) => t.status === 'pending');

    const metadata = (farmer?.metadata as Record<string, unknown>) ?? {};
    const pm = farmer?.pincode_master as { pincode?: string; district?: string; state?: string } | null;
    const pincode = pm?.pincode ?? null;
    const totalAcre =
      farmer?.total_acreage != null
        ? String(farmer.total_acreage)
        : metadata.acreage
          ? String(metadata.acreage)
          : '—';

    return {
      lead: { ...lead, pincode },
      farmer: {
        id: farmerId,
        name: lead.farmerName,
        phone: lead.phone,
        email: null,
        district: lead.district ?? pm?.district ?? null,
        state: lead.state ?? pm?.state ?? null,
        pincode,
        village: farmer?.village ? String(farmer.village) : null,
        language: farmer?.preferred_language ?? 'Hindi',
        territory: [lead.district, lead.state].filter(Boolean).join(', ') || '—',
        crop: primaryCrop,
        acreage: totalAcre,
        whatsappSame: farmer?.whatsapp_same_as_phone !== false,
        whatsappPhone: farmer?.whatsapp_phone ? String(farmer.whatsapp_phone) : null,
        shippingAddress: farmer?.shipping_address ? String(farmer.shipping_address) : null,
        deliveryPincode: farmer?.delivery_pincode ? String(farmer.delivery_pincode) : null,
        roiEnabled: Boolean(farmer?.roi_enabled),
        farmerNotes: farmer?.farmer_notes ? String(farmer.farmer_notes) : null,
        assignedCropAdvisor: farmer?.assigned_crop_advisor
          ? String(farmer.assigned_crop_advisor)
          : null,
        farmSize: metadata.farmSize ? String(metadata.farmSize) : '—',
        irrigation: metadata.irrigation ? String(metadata.irrigation) : '—',
        soilType: metadata.soilType ? String(metadata.soilType) : 'Loamy',
        rating: lead.leadScore,
      },
      farmOverview: {
        totalBlocks: blocks.length || Number(metadata.totalBlocks) || 1,
        totalArea: metadata.totalArea ?? '—',
        primaryCrop,
        soilType: metadata.soilType ?? 'Loamy',
        blocks: blocks.map((b) => ({
          id: String((b as { id: string }).id),
          name: String((b as { name?: string }).name ?? (b as { plot_label?: string }).plot_label ?? 'Block'),
          cropType: String(b.crop_type),
          acreage: b.acreage,
          isPrimary: Boolean(b.is_primary),
        })),
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
        dueLabel: formatDateTime(t.due_at as string),
        status: t.status,
        type: t.task_type,
      })),
      nextFollowUp: nextTask
        ? {
            id: nextTask.id,
            title: nextTask.title,
            dueLabel: formatDateTime(nextTask.due_at as string),
            notes: nextTask.notes,
          }
        : data.follow_up_at
          ? {
              id: null,
              title: 'Scheduled follow-up',
              dueLabel: formatDateTime(data.follow_up_at as string),
              notes: data.notes,
            }
          : null,
      timeline: timeline.slice(0, 15),
      orders: orders.slice(0, 5).map((o) => ({
        id: o.id,
        label: o.order_name ?? 'Order',
        amount: Number(o.total_amount) || 0,
        date: formatDateTime(o.created_at as string),
      })),
      stages: Object.entries(STAGE_LABELS).map(([id, label]) => ({
        id,
        label,
        active: id === lead.stage,
        done: this.stageIndex(id as LeadStage) < this.stageIndex(lead.stage),
      })),
    };
  },

  stageIndex(stage: LeadStage): number {
    const order: LeadStage[] = [
      'new_lead',
      'interested',
      'follow_up',
      'recommendation',
      'order_placed',
      'repeat_customer',
    ];
    return order.indexOf(stage);
  },

  async createLead(
    input: {
      phone: string;
      name?: string;
      intent?: string;
      notes?: string;
      cropType?: string;
      district?: string;
      state?: string;
      whatsappSame?: boolean;
      whatsappPhone?: string;
      language?: string;
      pincode?: string;
      village?: string;
      totalAcreage?: number;
      shippingAddress?: string;
      deliveryPincode?: string;
      assignedCropAdvisor?: string;
      roiEnabled?: boolean;
      farmerNotes?: string;
      cropBlocks?: Array<{ blockName?: string; cropName: string; acreage?: number; plantingDate?: string }>;
    },
    agentEmail: string
  ) {
    const result = await leadService.createLead({
      phone: input.phone,
      name: input.name,
      intent: 'general',
      source: 'phone',
      notes: input.notes ?? input.farmerNotes,
      cropType: input.cropType ?? input.cropBlocks?.[0]?.cropName,
      district: input.district,
    });

    const { telecallerFarmerProfileService } = await import('./telecaller-farmer-profile.service.js');
    await telecallerFarmerProfileService.applyProfileOnCreate(result.farmer.id, {
      name: input.name,
      whatsappSame: input.whatsappSame,
      whatsappPhone: input.whatsappPhone,
      language: input.language,
      pincode: input.pincode,
      village: input.village,
      totalAcreage: input.totalAcreage,
      shippingAddress: input.shippingAddress,
      deliveryPincode: input.deliveryPincode,
      assignedCropAdvisor: input.assignedCropAdvisor,
      roiEnabled: input.roiEnabled,
      farmerNotes: input.farmerNotes,
      cropBlocks: input.cropBlocks,
    });

    await supabase
      .from('leads')
      .update({
        assigned_to: agentEmail,
        stage: 'new_lead',
        follow_up_at: new Date(Date.now() + 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', String(result.lead.id));

    if (input.state) {
      await supabase.from('farmers').update({ state: input.state }).eq('id', result.farmer.id);
    }

    return this.getLeadDetail(String(result.lead.id));
  },

  async updateLead(
    leadId: string,
    patch: {
      stage?: LeadStage;
      notes?: string;
      followUpAt?: string | null;
      assignedTo?: string | null;
      priority?: string;
    },
    agentEmail: string
  ) {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.stage) updates.stage = patch.stage;
    if (patch.notes !== undefined) updates.notes = patch.notes;
    if (patch.followUpAt !== undefined) updates.follow_up_at = patch.followUpAt;
    if (patch.assignedTo !== undefined) updates.assigned_to = patch.assignedTo;
    if (patch.priority) updates.priority = patch.priority;

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId)
      .select('farmer_id, stage')
      .single();

    if (error || !data) throw new NotFoundError('Lead not found');

    if (patch.stage) {
      await logInteraction(
        data.farmer_id as string,
        'crm',
        `Lead stage updated to ${STAGE_LABELS[patch.stage as LeadStage] ?? patch.stage} by ${agentEmail}`
      );
    }

    await touchLead(leadId, data.farmer_id as string);
    return this.getLeadDetail(leadId);
  },

  async addNote(leadId: string, note: string, agentEmail: string) {
    const { data } = await supabase.from('leads').select('farmer_id, notes').eq('id', leadId).single();
    if (!data) throw new NotFoundError('Lead not found');

    const { error: noteError } = await supabase.from('telecaller_notes').insert({
      farmer_id: data.farmer_id,
      author: agentEmail,
      note,
    });
    throwIfSupabaseError(noteError, 'Could not save note');

    const merged = [data.notes, note].filter(Boolean).join('\n');
    await supabase
      .from('leads')
      .update({ notes: merged, updated_at: new Date().toISOString() })
      .eq('id', leadId);

    await logInteraction(data.farmer_id as string, 'note', `${agentEmail}: ${note}`);
    await touchLead(leadId, data.farmer_id as string);
    return this.getLeadDetail(leadId);
  },

  async createTask(
    leadId: string,
    input: { title: string; dueAt?: string; notes?: string; taskType?: string },
    agentEmail: string
  ) {
    const { data: lead } = await supabase.from('leads').select('farmer_id').eq('id', leadId).single();
    if (!lead) throw new NotFoundError('Lead not found');

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

  async completeTask(taskId: string) {
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

  async logCall(
    leadId: string,
    input: { outcome?: string; notes?: string; durationSeconds?: number },
    agentEmail: string
  ) {
    const { data: lead } = await supabase.from('leads').select('farmer_id').eq('id', leadId).single();
    if (!lead) throw new NotFoundError('Lead not found');

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
    await logInteraction(
      lead.farmer_id as string,
      'call',
      `Call: ${input.outcome ?? 'completed'}${input.notes ? ` — ${input.notes}` : ''}`
    );
    await touchLead(leadId, lead.farmer_id as string);
    return this.getLeadDetail(leadId);
  },

  async listTasks(agentEmail: string, status = 'pending') {
    const { data, error } = await supabase
      .from('crm_tasks')
      .select('*, farmers(name, first_name, last_name, phone), leads(stage)')
      .or(`assigned_to.eq.${agentEmail},assigned_to.is.null`)
      .eq('status', status)
      .order('due_at', { ascending: true })
      .limit(100);

    throwIfSupabaseError(error, 'Could not load tasks');

    return (data ?? []).map((t) => {
      const farmer = t.farmers as Record<string, unknown> | null;
      const name = farmer ? displayFarmerName(farmer) : 'Farmer';
      return {
        id: t.id,
        title: t.title,
        dueLabel: formatDateTime(t.due_at as string),
        status: t.status,
        farmerName: name,
        phone: farmer?.phone,
        leadId: t.lead_id,
        stage: (t.leads as { stage?: string } | null)?.stage,
      };
    });
  },

  async listCalls(agentEmail?: string, limit = 50) {
    let q = supabase
      .from('crm_call_logs')
      .select('*, farmers(name, first_name, last_name, phone)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (agentEmail) q = q.eq('agent_email', agentEmail);

    const { data, error } = await q;
    throwIfSupabaseError(error, 'Could not load calls');

    return (data ?? []).map((c) => {
      const farmer = c.farmers as Record<string, unknown> | null;
      return {
        id: c.id,
        farmerName: farmer ? displayFarmerName(farmer) : 'Farmer',
        phone: farmer?.phone,
        outcome: c.outcome,
        durationSeconds: c.duration_seconds,
        agentEmail: c.agent_email,
        atLabel: formatDateTime(c.created_at as string),
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

    const byFarmer = new Map<string, Record<string, unknown>>();
    for (const row of data ?? []) {
      const fid = String(row.farmer_id);
      if (!byFarmer.has(fid)) {
        const rawFarmer = row.farmers;
        const farmer = (Array.isArray(rawFarmer) ? rawFarmer[0] : rawFarmer) as
          | Record<string, unknown>
          | null
          | undefined;
        byFarmer.set(fid, {
          farmerId: fid,
          farmerName: farmer ? displayFarmerName(farmer) : 'Farmer',
          phone: farmer?.phone,
          lastMessage: String(row.content ?? '').slice(0, 120),
          lastAt: formatDateTime(row.created_at as string),
          direction: row.direction,
        });
      }
    }

    return [...byFarmer.values()].slice(0, limit);
  },

  async getWhatsAppMessages(farmerId: string) {
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
      atLabel: formatDateTime(m.created_at as string),
      createdAt: m.created_at,
    }));
  },

  async sendWhatsAppMessage(farmerId: string, text: string, agentEmail: string) {
    const { data: farmer, error } = await supabase
      .from('farmers')
      .select('phone')
      .eq('id', farmerId)
      .single();

    if (error || !farmer?.phone) throw new NotFoundError('Farmer phone not found');

    const phone = String(farmer.phone).replace(/\D/g, '');
    const to = phone.length === 10 ? `91${phone}` : phone;

    let sent = false;
    let sendMode = 'session';
    try {
      const result = await whatsappService.sendToFarmer({
        phone: to,
        farmerId,
        text,
      });
      sendMode = result.mode;
      sent = true;
    } catch {
      /* CRM still logs outbound when WhatsApp provider is not configured */
    }

    await supabase.from('interaction_logs').insert({
      farmer_id: farmerId,
      channel: 'whatsapp',
      direction: 'outbound',
      message_type: sendMode === 'template' ? 'template' : 'text',
      content: text,
    });

    await logInteraction(
      farmerId,
      'whatsapp',
      `${sent ? 'Sent' : 'Queued'} by ${agentEmail}: ${text.slice(0, 80)}`
    );

    return { messages: await this.getWhatsAppMessages(farmerId), sent };
  },

  async listFieldFindings(farmerId: string, page = 1, limit = 10) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('crm_field_findings')
      .select('*', { count: 'exact' })
      .eq('farmer_id', farmerId)
      .is('archived_at', null)
      .order('visited_at', { ascending: false })
      .range(from, to);

    throwIfSupabaseError(error, 'Could not load field findings');

    const rows = data ?? [];
    const total = count ?? 0;

    const findings = rows.map((r) => this.mapFieldFinding(r));

    return {
      findings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  },

  mapFieldFinding(r: Record<string, unknown>) {
    const params = (r.parameters as { label: string; value: string }[]) ?? [];
    const photos = (r.photo_urls as string[]) ?? [];
    return {
      id: r.id,
      visitedAt: r.visited_at,
      visitedLabel: formatDateTime(r.visited_at as string),
      blockName: r.block_name,
      cropType: r.crop_type,
      agronomistName: r.agronomist_name,
      agronomistRole: r.agronomist_role,
      agronomistInitials: String(r.agronomist_name || 'A')
        .split(/\s+/)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      observations: r.observations,
      parameters: params,
      diseasePest: r.disease_pest,
      diseaseTone: r.disease_tone,
      actionTaken: r.action_taken,
      followUpLabel: formatDateTime(r.follow_up_at as string),
      photoUrls: photos,
      photoCount: photos.length,
    };
  },

  async createFieldFinding(
    farmerId: string,
    leadId: string | null,
    input: {
      blockId?: string;
      blockName: string;
      cropType: string;
      observations?: string;
      diseasePest?: string;
      diseaseTone?: string;
      actionTaken?: string;
      parameters?: Array<{ label: string; value: string; key?: string }>;
      photoUrls?: string[];
      agronomistName?: string;
      agronomistRole?: string;
    }
  ) {
    const { data, error } = await supabase
      .from('crm_field_findings')
      .insert({
        farmer_id: farmerId,
        lead_id: leadId,
        block_id: input.blockId ?? null,
        block_name: input.blockName,
        crop_type: input.cropType,
        agronomist_name: input.agronomistName ?? 'Field Agronomist',
        agronomist_role: input.agronomistRole ?? 'Field Agronomist',
        observations: input.observations,
        disease_pest: input.diseasePest ?? 'Pending review',
        disease_tone: input.diseaseTone ?? 'warning',
        action_taken: input.actionTaken,
        parameters:
          input.parameters && input.parameters.length > 0
            ? input.parameters
            : [{ label: 'Visit', value: 'Recorded from field PWA' }],
        follow_up_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        photo_urls: input.photoUrls ?? [],
      })
      .select()
      .single();

    throwIfSupabaseError(error, 'Could not save field finding');
    return this.mapFieldFinding(data as Record<string, unknown>);
  },

  async updateFieldFinding(id: string, patch: Record<string, unknown>) {
    const allowed = ['observations', 'disease_pest', 'disease_tone', 'action_taken', 'follow_up_at', 'parameters'];
    const updates: Record<string, unknown> = {};
    for (const k of allowed) {
      if (patch[k] !== undefined) updates[k] = patch[k];
    }
    const { data, error } = await supabase
      .from('crm_field_findings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    throwIfSupabaseError(error, 'Could not update field finding');
    return this.mapFieldFinding(data as Record<string, unknown>);
  },

  async getNavBadges() {
    const [tasksRes, escRes] = await Promise.all([
      supabase
        .from('crm_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('agronomist_escalations')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'assigned', 'in_review']),
    ]);
    return {
      followUpTasks: tasksRes.count ?? 0,
      pendingEscalations: escRes.count ?? 0,
    };
  },
};
