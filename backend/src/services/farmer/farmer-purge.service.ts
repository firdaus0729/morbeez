import { supabase } from '../../lib/supabase.js';
import { logger } from '../../lib/logger.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';

/**
 * Hard-delete a farmer and all CRM / WhatsApp history so the next inbound
 * message creates a brand-new farmer + lead.
 */
export const farmerPurgeService = {
  async purgeByFarmerId(farmerId: string): Promise<{ phone: string | null }> {
    const { data: farmer, error: farmerErr } = await supabase
      .from('farmers')
      .select('id, phone')
      .eq('id', farmerId)
      .maybeSingle();
    throwIfSupabaseError(farmerErr, 'Could not load farmer for purge');
    if (!farmer) return { phone: null };

    await this.purgeRelatedRows(farmerId, farmer.phone ?? null);

    const { error: deleteErr } = await supabase.from('farmers').delete().eq('id', farmerId);
    throwIfSupabaseError(deleteErr, 'Could not delete farmer');

    logger.info({ farmerId, phone: farmer.phone }, 'Farmer purged completely');
    return { phone: farmer.phone ?? null };
  },

  async purgeByLeadId(
    leadId: string
  ): Promise<{ ok: true; farmerId: string | null; phone: string | null } | { ok: false }> {
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('id, farmer_id')
      .eq('id', leadId)
      .maybeSingle();
    throwIfSupabaseError(leadErr, 'Could not load lead for purge');
    if (!lead) return { ok: false };

    if (!lead.farmer_id) {
      await supabase.from('leads').delete().eq('id', leadId);
      return { ok: true, farmerId: null, phone: null };
    }

    const { phone } = await this.purgeByFarmerId(lead.farmer_id);
    return { ok: true, farmerId: lead.farmer_id, phone };
  },

  async purgeByPhone(phone: string): Promise<boolean> {
    const { data: farmer } = await supabase
      .from('farmers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();
    if (!farmer) return false;
    await this.purgeByFarmerId(farmer.id);
    return true;
  },

  async purgeRelatedRows(farmerId: string, phone: string | null): Promise<void> {
    const { data: sessions } = await supabase
      .from('ai_advisory_sessions')
      .select('id')
      .eq('farmer_id', farmerId);
    const sessionIds = (sessions ?? []).map((s) => s.id);

    if (sessionIds.length) {
      await supabase.from('ai_advisory_outputs').delete().in('session_id', sessionIds);
      await supabase.from('ai_product_recommendations').delete().in('session_id', sessionIds);
    }

    await supabase.from('leads').delete().eq('farmer_id', farmerId);
    await supabase.from('interaction_logs').delete().eq('farmer_id', farmerId);
    await supabase.from('quotation_inquiries').delete().eq('farmer_id', farmerId);
    await supabase.from('callback_requests').delete().eq('farmer_id', farmerId);
    await supabase.from('crm_tasks').delete().eq('farmer_id', farmerId);
    await supabase.from('crm_call_logs').delete().eq('farmer_id', farmerId);
    await supabase.from('crm_internal_notes').delete().eq('farmer_id', farmerId);
    await supabase.from('cultivation_activities').delete().eq('farmer_id', farmerId);
    await supabase.from('ai_learning_samples').delete().eq('farmer_id', farmerId);
    await supabase.from('recommendation_follow_ups').delete().eq('farmer_id', farmerId);
    await supabase.from('recommendation_applications').delete().eq('farmer_id', farmerId);
    await supabase.from('recommendation_records').delete().eq('farmer_id', farmerId);
    await supabase.from('terminology_review_tasks').delete().eq('farmer_id', farmerId);
    await supabase.from('advisory_reuse_cases').delete().eq('source_farmer_id', farmerId);
    await supabase.from('ai_accuracy_events').delete().eq('farmer_id', farmerId);
    await supabase.from('ai_case_outcomes').delete().eq('farmer_id', farmerId);
    await supabase.from('telecaller_notes').delete().eq('farmer_id', farmerId);
    await supabase.from('farmer_roi_audit_log').delete().eq('farmer_id', farmerId);
    await supabase.from('farmer_roi_entries').delete().eq('farmer_id', farmerId);
    await supabase.from('farmer_roi_settings').delete().eq('farmer_id', farmerId);
    await supabase.from('farmer_image_hashes').delete().eq('farmer_id', farmerId);
    await supabase.from('farmer_ai_usage_daily').delete().eq('farmer_id', farmerId);

    await supabase.from('whatsapp_order_notifications').delete().eq('farmer_id', farmerId);
    if (phone) {
      await supabase.from('whatsapp_order_notifications').delete().eq('phone', phone);
    }
    await supabase.from('commerce_orders').delete().eq('farmer_id', farmerId);

    // Remaining rows with ON DELETE CASCADE are removed when farmers row is deleted.
  },
};
