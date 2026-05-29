import { supabase } from '../../../lib/supabase.js';
import type { AdvisoryLanguage } from '../../ai/types.js';

const CREDIT_TYPES = new Set(['harvest', 'income']);
const DEBIT_TYPES = new Set(['labour', 'purchase', 'misc']);

function monthRange(year: number, month: number): { from: string; to: string } {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export const ledgerSummaryService = {
  async balanceForFarmer(farmerId: string, fromDate?: string, toDate?: string): Promise<{
    credits: number;
    debits: number;
    balance: number;
    entryCount: number;
  }> {
    let q = supabase
      .from('farmer_roi_entries')
      .select('entry_type, amount_inr')
      .eq('farmer_id', farmerId);

    if (fromDate) q = q.gte('entry_date', fromDate);
    if (toDate) q = q.lte('entry_date', toDate);

    const { data } = await q;
    let credits = 0;
    let debits = 0;
    for (const row of data ?? []) {
      const amt = Number(row.amount_inr ?? 0);
      if (CREDIT_TYPES.has(String(row.entry_type))) credits += amt;
      else if (DEBIT_TYPES.has(String(row.entry_type))) debits += amt;
    }
    return {
      credits,
      debits,
      balance: credits - debits,
      entryCount: data?.length ?? 0,
    };
  },

  async formatMonthlyLedger(farmerId: string, language: AdvisoryLanguage, refDate = new Date()): Promise<string> {
    const parts = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
    }).formatToParts(refDate);
    const year = Number(parts.find((p) => p.type === 'year')?.value ?? refDate.getFullYear());
    const month = Number(parts.find((p) => p.type === 'month')?.value ?? refDate.getMonth() + 1);
    const { from, to } = monthRange(year, month);

    const { data: entries } = await supabase
      .from('farmer_roi_entries')
      .select('entry_type, amount_inr, note, entry_date')
      .eq('farmer_id', farmerId)
      .gte('entry_date', from)
      .lte('entry_date', to)
      .order('entry_date', { ascending: false })
      .limit(15);

    const totals = await this.balanceForFarmer(farmerId, from, to);

    const monthLabel = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'long',
      year: 'numeric',
    }).format(refDate);

    const intro =
      language === 'ml'
        ? `📒 ${monthLabel} — നിങ്ങളുടെ ഫാം ലെഡ്ജർ`
        : `📒 ${monthLabel} — your farm ledger`;

    const summary =
      language === 'ml'
        ? `ആദായം: ₹${totals.credits.toFixed(0)}\nചെലവ്: ₹${totals.debits.toFixed(0)}\nബാലൻസ്: ₹${totals.balance.toFixed(0)}`
        : `Income: ₹${totals.credits.toFixed(0)}\nExpense: ₹${totals.debits.toFixed(0)}\nBalance: ₹${totals.balance.toFixed(0)}`;

    if (!entries?.length) {
      return `${intro}\n\n${summary}\n\n${
        language === 'ml' ? 'ഈ മാസം എൻട്രികൾ ഇല്ല.' : 'No entries this month yet.'
      }`;
    }

    const lines = entries.map((e, i) => {
      const sign = CREDIT_TYPES.has(String(e.entry_type)) ? '+' : '-';
      const note = e.note ? ` (${String(e.note).slice(0, 40)})` : '';
      return `${i + 1}. ${e.entry_date} ${e.entry_type} ${sign}₹${Number(e.amount_inr).toFixed(0)}${note}`;
    });

    const footer =
      language === 'ml'
        ? '\n\nPDF ലെഡ്ജർ ഉടൻ ലഭ്യമാകും. ഇപ്പോൾ WhatsApp സംഗ്രഹം മാത്രം.'
        : '\n\nPDF ledger coming soon. This is your WhatsApp summary.';

    return `${intro}\n\n${summary}\n\n${lines.join('\n')}${footer}`;
  },
};
