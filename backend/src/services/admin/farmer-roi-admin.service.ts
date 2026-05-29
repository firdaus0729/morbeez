import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { verifyPassword } from '../../lib/password.js';

export type RoiEntryType = 'labour' | 'purchase' | 'misc' | 'harvest' | 'income';

const CREDIT_TYPES = new Set<RoiEntryType>(['harvest', 'income']);

export type RoiEntryRow = {
  id: string;
  entryDate: string;
  category: string;
  comments: string | null;
  debitInr: number | null;
  creditInr: number | null;
  amountInr: number;
  staffEditUsed: boolean;
  staffEditedAt: string | null;
  staffEditedBy: string | null;
  createdAt: string;
};

function mapEntry(r: Record<string, unknown>): RoiEntryRow {
  const debit = r.debit_inr != null ? Number(r.debit_inr) : null;
  const credit = r.credit_inr != null ? Number(r.credit_inr) : null;
  const amount = Number(r.amount_inr ?? debit ?? credit ?? 0);
  return {
    id: String(r.id),
    entryDate: String(r.entry_date),
    category: String(r.entry_type),
    comments: r.comments ? String(r.comments) : r.note ? String(r.note) : null,
    debitInr: debit,
    creditInr: credit,
    amountInr: amount,
    staffEditUsed: Boolean(r.staff_edit_used),
    staffEditedAt: r.staff_edited_at ? String(r.staff_edited_at) : null,
    staffEditedBy: r.staff_edited_by ? String(r.staff_edited_by) : null,
    createdAt: String(r.created_at),
  };
}

function snapshotFromRow(r: Record<string, unknown>) {
  return {
    entry_date: r.entry_date,
    entry_type: r.entry_type,
    comments: r.comments ?? r.note,
    debit_inr: r.debit_inr,
    credit_inr: r.credit_inr,
    amount_inr: r.amount_inr,
  };
}

function debitCreditForType(type: RoiEntryType, amount: number): { debit_inr: number | null; credit_inr: number | null } {
  if (CREDIT_TYPES.has(type)) return { debit_inr: null, credit_inr: amount };
  return { debit_inr: amount, credit_inr: null };
}

async function verifyStaffPassword(email: string, password: string): Promise<void> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('password_hash')
    .eq('email', email)
    .maybeSingle();
  throwIfSupabaseError(error, 'Could not verify staff');
  if (!data?.password_hash || !verifyPassword(password, data.password_hash)) {
    throw new ValidationError('Incorrect staff password');
  }
}

export const farmerRoiAdminService = {
  async listEntries(farmerId: string, limit = 100): Promise<{ entries: RoiEntryRow[]; summary: { debits: number; credits: number; balance: number } }> {
    const { data, error } = await supabase
      .from('farmer_roi_entries')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);
    throwIfSupabaseError(error, 'Could not load ROI entries');

    let debits = 0;
    let credits = 0;
    for (const row of data ?? []) {
      const d = row.debit_inr != null ? Number(row.debit_inr) : null;
      const c = row.credit_inr != null ? Number(row.credit_inr) : null;
      if (d != null) debits += d;
      else if (c != null) credits += c;
      else {
        const amt = Number(row.amount_inr ?? 0);
        if (CREDIT_TYPES.has(String(row.entry_type) as RoiEntryType)) credits += amt;
        else debits += amt;
      }
    }

    return {
      entries: (data ?? []).map((r) => mapEntry(r as Record<string, unknown>)),
      summary: { debits, credits, balance: credits - debits },
    };
  },

  async staffEditEntry(params: {
    farmerId: string;
    entryId: string;
    staffEmail: string;
    password: string;
    patch: {
      entryDate?: string;
      category?: RoiEntryType;
      comments?: string | null;
      debitInr?: number | null;
      creditInr?: number | null;
    };
  }): Promise<RoiEntryRow> {
    await verifyStaffPassword(params.staffEmail, params.password);

    const { data: existing, error: fetchErr } = await supabase
      .from('farmer_roi_entries')
      .select('*')
      .eq('id', params.entryId)
      .eq('farmer_id', params.farmerId)
      .maybeSingle();
    if (fetchErr) throwIfSupabaseError(fetchErr, 'Could not load entry');
    if (!existing) throw new NotFoundError('ROI entry not found');
    if (existing.staff_edit_used) {
      throw new ValidationError('This entry was already edited once. Create a correcting entry instead.');
    }

    const category = (params.patch.category ?? existing.entry_type) as RoiEntryType;
    let debit = params.patch.debitInr !== undefined ? params.patch.debitInr : existing.debit_inr != null ? Number(existing.debit_inr) : null;
    let credit = params.patch.creditInr !== undefined ? params.patch.creditInr : existing.credit_inr != null ? Number(existing.credit_inr) : null;

    if (params.patch.debitInr === undefined && params.patch.creditInr === undefined) {
      const amt = Number(existing.amount_inr ?? 0);
      const dc = debitCreditForType(category, amt);
      debit = dc.debit_inr;
      credit = dc.credit_inr;
    }

    const amount = (debit ?? 0) + (credit ?? 0);
    if (amount <= 0) throw new ValidationError('Debit or credit amount is required');

    const updates: Record<string, unknown> = {
      entry_type: category,
      entry_date: params.patch.entryDate ?? existing.entry_date,
      comments: params.patch.comments !== undefined ? params.patch.comments : existing.comments ?? existing.note,
      note: params.patch.comments !== undefined ? params.patch.comments : existing.comments ?? existing.note,
      debit_inr: debit,
      credit_inr: credit,
      amount_inr: amount,
      staff_edit_used: true,
      staff_edited_at: new Date().toISOString(),
      staff_edited_by: params.staffEmail,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from('farmer_roi_entries')
      .update(updates)
      .eq('id', params.entryId)
      .eq('farmer_id', params.farmerId)
      .select()
      .single();
    throwIfSupabaseError(error, 'Could not update ROI entry');

    await supabase.from('farmer_roi_audit_log').insert({
      farmer_id: params.farmerId,
      entry_id: params.entryId,
      action: 'update',
      old_amount_inr: existing.amount_inr,
      new_amount_inr: amount,
      old_snapshot: snapshotFromRow(existing as Record<string, unknown>),
      new_snapshot: snapshotFromRow(updated as Record<string, unknown>),
      edited_by: params.staffEmail,
      reason: 'Telecaller one-time correction',
      actor: 'telecaller',
    });

    return mapEntry(updated as Record<string, unknown>);
  },
};
