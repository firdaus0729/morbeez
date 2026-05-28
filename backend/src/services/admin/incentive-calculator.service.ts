import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';

export const incentiveCalculatorService = {
  async estimateMonthlyIncentive(employeeProfileId: string, monthSalesInr: number, conversionRatePct: number) {
    const { data, error } = await supabase
      .from('employee_compensation')
      .select('*')
      .eq('employee_profile_id', employeeProfileId)
      .maybeSingle();
    throwIfSupabaseError(error, 'Could not load compensation');
    if (!data || !data.incentive_enabled) {
      return { estimatedIncentive: 0, conversionBonus: 0, totalBonus: 0 };
    }
    const target = Number(data.monthly_sales_target ?? 0);
    const pct = Number(data.incentive_pct_after_target ?? 0);
    const conversionTarget = Number(data.conversion_target_pct ?? 50);
    const additional = Number(data.additional_bonus_after_conversion ?? 0);

    const estimatedIncentive = monthSalesInr > target ? ((monthSalesInr - target) * pct) / 100 : 0;
    const conversionBonus =
      data.conversion_bonus_enabled && conversionRatePct > conversionTarget ? additional : 0;
    const retentionBonus = data.retention_bonus_enabled ? Number(data.farmer_retention_bonus ?? 0) : 0;
    const relationshipBonus = data.relationship_bonus_enabled ? 500 : 0;
    const followUpBonus = data.follow_up_bonus_enabled ? 500 : 0;
    const totalBonus =
      estimatedIncentive + conversionBonus + retentionBonus + relationshipBonus + followUpBonus;
    return { estimatedIncentive, conversionBonus, totalBonus };
  },
};
