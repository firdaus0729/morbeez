import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError } from '../../lib/errors.js';

export type InternalNoteCategory =
  | 'general'
  | 'preference'
  | 'acreage'
  | 'disease_pattern'
  | 'callback'
  | 'commerce';

export const crmInternalNotesService = {
  async list(farmerId: string, includeArchived = false) {
    let q = supabase
      .from('crm_internal_notes')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (!includeArchived) {
      q = q.is('archived_at', null);
    }

    const { data, error } = await q.limit(100);
    throwIfSupabaseError(error, 'Could not load internal notes');
    return (data ?? []).map(mapNote);
  },

  async create(
    farmerId: string,
    input: {
      body: string;
      category?: InternalNoteCategory;
      author?: string;
      pinned?: boolean;
    }
  ) {
    const { data, error } = await supabase
      .from('crm_internal_notes')
      .insert({
        farmer_id: farmerId,
        body: input.body.trim(),
        category: input.category ?? 'general',
        author: input.author ?? null,
        pinned: input.pinned ?? false,
      })
      .select()
      .single();
    throwIfSupabaseError(error, 'Could not create internal note');
    return mapNote(data);
  },

  async update(
    noteId: string,
    patch: {
      body?: string;
      category?: InternalNoteCategory;
      pinned?: boolean;
    }
  ) {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.body != null) updates.body = patch.body.trim();
    if (patch.category != null) updates.category = patch.category;
    if (patch.pinned != null) updates.pinned = patch.pinned;

    const { data, error } = await supabase
      .from('crm_internal_notes')
      .update(updates)
      .eq('id', noteId)
      .is('archived_at', null)
      .select()
      .single();
    throwIfSupabaseError(error, 'Could not update internal note');
    if (!data) throw new NotFoundError('Internal note not found');
    return mapNote(data);
  },

  async archive(noteId: string) {
    const { data, error } = await supabase
      .from('crm_internal_notes')
      .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', noteId)
      .select()
      .single();
    throwIfSupabaseError(error, 'Could not archive internal note');
    if (!data) throw new NotFoundError('Internal note not found');
    return mapNote(data);
  },
};

function mapNote(row: Record<string, unknown>) {
  return {
    id: row.id,
    farmerId: row.farmer_id,
    author: row.author,
    category: row.category,
    body: row.body,
    pinned: row.pinned,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
