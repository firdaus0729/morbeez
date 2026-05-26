#!/usr/bin/env node
/**
 * Seed demo farmers, leads, tasks, and interactions for Telecaller CRM.
 * Safe to re-run: upserts farmers by phone and updates existing leads.
 *
 * Usage: npm run crm:seed
 * Optional: npm run crm:seed -- --assign=admin@morbeez.in
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv() {
  const path = join(root, 'backend', '.env');
  if (!existsSync(path)) {
    console.error('Missing backend/.env');
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(path, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[t.slice(0, eq).trim()] = val;
  }
  return env;
}

function sbHeaders(env, prefer = 'return=representation') {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: prefer,
  };
}

async function sb(env, table, method, body, query = '', prefer) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: sbHeaders(env, prefer),
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || (typeof data === 'string' ? data : JSON.stringify(data));
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return data;
}

async function sbGet(env, table, query) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: sbHeaders(env, 'return=representation'),
  });
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error(data?.message || JSON.stringify(data));
  return Array.isArray(data) ? data : [];
}

const DEMO = [
  { name: 'Ramesh Kumar', phone: '9876543210', state: 'Kerala', district: 'Wayanad', stage: 'interested', crop: 'Banana', notes: 'Farmer requested delivery in morning time. Call before delivery.', score: 4.6 },
  { name: 'Suresh Patel', phone: '9876543211', state: 'Gujarat', district: 'Anand', stage: 'follow_up', crop: 'Cotton', notes: 'Interested in pest control combo.', score: 4.2 },
  { name: 'Anita Devi', phone: '9876543212', state: 'Bihar', district: 'Patna', stage: 'recommendation', crop: 'Wheat', notes: 'Sent product recommendation via WhatsApp.', score: 4.8 },
  { name: 'Vikram Singh', phone: '9876543213', state: 'Punjab', district: 'Ludhiana', stage: 'order_placed', crop: 'Wheat', notes: 'Placed order ORD125439.', score: 4.5 },
  { name: 'Priya Sharma', phone: '9876543214', state: 'Maharashtra', district: 'Nagpur', stage: 'new_lead', crop: 'Sugarcane', notes: 'New enquiry from dealer referral.', score: 4.0 },
  { name: 'Mohammed Ali', phone: '9876543215', state: 'Telangana', district: 'Hyderabad', stage: 'interested', crop: 'Chilli', notes: 'Asked about fungicide for leaf spot.', score: 4.3 },
  { name: 'Lakshmi Reddy', phone: '9876543216', state: 'Andhra Pradesh', district: 'Guntur', stage: 'follow_up', crop: 'Cotton', notes: 'Follow up after advisory session.', score: 4.7 },
  { name: 'Rajesh Yadav', phone: '9876543217', state: 'Uttar Pradesh', district: 'Lucknow', stage: 'repeat_customer', crop: 'Paddy', notes: 'Repeat buyer — 3 orders.', score: 4.9 },
];

async function upsertFarmer(env, row, now) {
  const payload = {
    phone: row.phone,
    name: row.name,
    state: row.state,
    district: row.district,
    source: 'seed',
    metadata: {
      acreage: '5 acres',
      farmSize: 'Medium',
      irrigation: 'Drip',
      soilType: 'Loamy',
      soilReportId: 'SR-2025-001',
      soilReportDate: '15 May 2025',
      soilHealth: 'Moderate',
      soilPh: '6.8',
      totalBlocks: 2,
      totalArea: '5 acres',
      language: row.state === 'Kerala' ? 'Malayalam' : 'Hindi',
    },
    updated_at: now.toISOString(),
  };

  const upserted = await sb(
    env,
    'farmers',
    'POST',
    payload,
    '?on_conflict=phone',
    'return=representation,resolution=merge-duplicates'
  );
  const farmer = Array.isArray(upserted) ? upserted[0] : upserted;
  if (farmer?.id) return farmer;

  const existing = await sbGet(env, 'farmers', `phone=eq.${row.phone}&select=id,name&limit=1`);
  if (!existing[0]) throw new Error(`Could not upsert farmer ${row.name}`);
  return existing[0];
}

async function ensurePrimaryCrop(env, farmerId, crop) {
  const crops = await sbGet(
    env,
    'farmer_crops',
    `farmer_id=eq.${farmerId}&is_primary=eq.true&select=id&limit=1`
  );
  if (crops.length) {
    await sb(env, 'farmer_crops', 'PATCH', { crop_type: crop }, `?id=eq.${crops[0].id}`);
    return;
  }
  await sb(env, 'farmer_crops', 'POST', {
    farmer_id: farmerId,
    crop_type: crop,
    is_primary: true,
  });
}

async function upsertLead(env, farmerId, row, assignTo, followUp, lastInteraction) {
  const existing = await sbGet(
    env,
    'leads',
    `farmer_id=eq.${farmerId}&select=id&order=created_at.desc&limit=1`
  );

  const payload = {
    farmer_id: farmerId,
    intent: 'callback',
    source: 'phone',
    status: row.stage === 'order_placed' || row.stage === 'repeat_customer' ? 'won' : 'new',
    stage: row.stage,
    priority: 'normal',
    notes: row.notes,
    assigned_to: assignTo,
    follow_up_at: followUp,
    last_interaction_at: lastInteraction,
    lead_score: row.score,
    updated_at: new Date().toISOString(),
  };

  if (existing[0]?.id) {
    await sb(env, 'leads', 'PATCH', payload, `?id=eq.${existing[0].id}`);
    return existing[0].id;
  }

  const created = await sb(env, 'leads', 'POST', payload);
  const lead = Array.isArray(created) ? created[0] : created;
  return lead?.id;
}

async function ensureDemoInteractions(env, farmerId, lastInteraction) {
  const logs = await sbGet(
    env,
    'interaction_logs',
    `farmer_id=eq.${farmerId}&channel=eq.call&select=id&limit=1`
  );
  if (logs.length) return;

  await sb(env, 'interaction_logs', 'POST', [
    {
      farmer_id: farmerId,
      channel: 'call',
      direction: 'outbound',
      content: 'Initial outreach call completed.',
      created_at: lastInteraction,
    },
    {
      farmer_id: farmerId,
      channel: 'whatsapp',
      direction: 'outbound',
      content: 'Shared product brochure on WhatsApp.',
      created_at: lastInteraction,
    },
  ]);
}

async function ensureFollowUpTask(env, farmerId, leadId, assignTo, followUp) {
  const tasks = await sbGet(
    env,
    'crm_tasks',
    `farmer_id=eq.${farmerId}&task_type=eq.follow_up&status=eq.pending&select=id&limit=1`
  );
  if (tasks.length) {
    await sb(env, 'crm_tasks', 'PATCH', { due_at: followUp, assigned_to: assignTo }, `?id=eq.${tasks[0].id}`);
    return;
  }
  await sb(env, 'crm_tasks', 'POST', {
    farmer_id: farmerId,
    lead_id: leadId,
    assigned_to: assignTo,
    task_type: 'follow_up',
    title: 'Follow-up call',
    due_at: followUp,
    status: 'pending',
  });
}

async function main() {
  const env = loadEnv();
  const assignTo = process.argv.find((a) => a.startsWith('--assign='))?.split('=')[1] || null;
  const now = new Date();
  let processed = 0;

  for (const row of DEMO) {
    const farmer = await upsertFarmer(env, row, now);
    await ensurePrimaryCrop(env, farmer.id, row.crop);

    const followUp = new Date(now.getTime() + (processed + 1) * 86400000).toISOString();
    const lastInteraction = new Date(now.getTime() - processed * 3600000).toISOString();

    const leadId = await upsertLead(env, farmer.id, row, assignTo, followUp, lastInteraction);
    await ensureDemoInteractions(env, farmer.id, lastInteraction);
    if (leadId) await ensureFollowUpTask(env, farmer.id, leadId, assignTo, followUp);

    processed++;
    console.log('✓', row.name, row.stage);
  }

  console.log(`\nSeeded ${processed} demo leads (idempotent). Open /console/#telecaller`);
}

main().catch((e) => {
  console.error(e.message || e);
  setTimeout(() => process.exit(1), 50);
});
