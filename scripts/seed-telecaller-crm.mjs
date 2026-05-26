#!/usr/bin/env node
/**
 * Seed demo farmers, leads, tasks, and interactions for Telecaller CRM.
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

async function sb(env, table, method, body, query = '') {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'return=representation' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || JSON.stringify(data));
  return data;
}

const DEMO = [
  { name: 'Ramesh Kumar', phone: '9876543210', state: 'Bihar', district: 'Vaishali', stage: 'interested', crop: 'Paddy', notes: 'Farmer requested delivery in morning time. Call before delivery.', score: 4.6 },
  { name: 'Suresh Patel', phone: '9876543211', state: 'Gujarat', district: 'Anand', stage: 'follow_up', crop: 'Cotton', notes: 'Interested in pest control combo.', score: 4.2 },
  { name: 'Anita Devi', phone: '9876543212', state: 'Bihar', district: 'Patna', stage: 'recommendation', crop: 'Wheat', notes: 'Sent product recommendation via WhatsApp.', score: 4.8 },
  { name: 'Vikram Singh', phone: '9876543213', state: 'Punjab', district: 'Ludhiana', stage: 'order_placed', crop: 'Wheat', notes: 'Placed order ORD125439.', score: 4.5 },
  { name: 'Priya Sharma', phone: '9876543214', state: 'Maharashtra', district: 'Nagpur', stage: 'new_lead', crop: 'Sugarcane', notes: 'New enquiry from dealer referral.', score: 4.0 },
  { name: 'Mohammed Ali', phone: '9876543215', state: 'Telangana', district: 'Hyderabad', stage: 'interested', crop: 'Chilli', notes: 'Asked about fungicide for leaf spot.', score: 4.3 },
  { name: 'Lakshmi Reddy', phone: '9876543216', state: 'Andhra Pradesh', district: 'Guntur', stage: 'follow_up', crop: 'Cotton', notes: 'Follow up after advisory session.', score: 4.7 },
  { name: 'Rajesh Yadav', phone: '9876543217', state: 'Uttar Pradesh', district: 'Lucknow', stage: 'repeat_customer', crop: 'Paddy', notes: 'Repeat buyer — 3 orders.', score: 4.9 },
];

async function main() {
  const env = loadEnv();
  const assignTo = process.argv.find((a) => a.startsWith('--assign='))?.split('=')[1] || null;
  const now = new Date();
  let inserted = 0;

  for (const row of DEMO) {
    const farmers = await sb(env, 'farmers', 'POST', {
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
      },
      updated_at: now.toISOString(),
    }, '?on_conflict=phone');

    const farmer = Array.isArray(farmers) ? farmers[0] : farmers;
    if (!farmer?.id) {
      const existing = await fetch(
        `${env.SUPABASE_URL}/rest/v1/farmers?phone=eq.${row.phone}&select=id`,
        { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } }
      ).then((r) => r.json());
      if (!existing?.[0]) {
        console.warn('Skip', row.name);
        continue;
      }
      farmer.id = existing[0].id;
    }

    await sb(env, 'farmer_crops', 'POST', {
      farmer_id: farmer.id,
      crop_type: row.crop,
      is_primary: true,
    });

    const followUp = new Date(now.getTime() + (inserted + 1) * 86400000).toISOString();
    const lastInteraction = new Date(now.getTime() - inserted * 3600000).toISOString();

    const leads = await sb(env, 'leads', 'POST', {
      farmer_id: farmer.id,
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
    });

    const lead = Array.isArray(leads) ? leads[0] : leads;

    await sb(env, 'interaction_logs', 'POST', [
      { farmer_id: farmer.id, channel: 'call', direction: 'outbound', content: 'Initial outreach call completed.', created_at: lastInteraction },
      { farmer_id: farmer.id, channel: 'whatsapp', direction: 'outbound', content: 'Shared product brochure on WhatsApp.', created_at: lastInteraction },
    ]);

    await sb(env, 'crm_tasks', 'POST', {
      farmer_id: farmer.id,
      lead_id: lead?.id,
      assigned_to: assignTo,
      task_type: 'follow_up',
      title: 'Follow-up call',
      due_at: followUp,
      status: 'pending',
    });

    inserted++;
    console.log('✓', row.name, row.stage);
  }

  console.log(`\nSeeded ${inserted} demo leads. Open /console/#telecaller`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
