import { supabase } from '../../../lib/supabase.js';
import type { AdvisoryLanguage } from '../../ai/types.js';

/** Morbeez knowledge module that produced the farmer-visible answer (not generic ChatGPT). */
export type MorbeezReplyModule =
  | 'verified_case'
  | 'compatibility_chart'
  | 'knowledge_fallback'
  | 'crop_doctor_reuse'
  | 'crop_doctor_openai'
  | 'conversational_openai'
  | 'playbook'
  | 'regional_learning'
  | 'follow_up_memory';

export type ReplyAttributionMeta = {
  cropType?: string;
  district?: string;
  reuseCaseId?: string;
  verifiedCaseCount?: number;
  issueLabel?: string;
};

const MODULE_LABEL: Record<MorbeezReplyModule, Record<AdvisoryLanguage, string>> = {
  verified_case: {
    en: 'verified Morbeez field cases',
    ml: 'സ്ഥിരീകരിച്ച മോർബീസ് ഫീൽഡ് കേസുകൾ',
    ta: 'சரிபார்க்கப்பட்ட Morbeez வழக்கங்கள்',
    kn: 'ಪರಿಶೀಲಿತ Morbeez ಕೇಸ್‌ಗಳು',
    hi: 'सत्यापित Morbeez मामले',
  },
  compatibility_chart: {
    en: 'Morbeez tank-mix rules',
    ml: 'മോർബീസ് ടാങ്ക് മിശ്രണ നിയമങ്ങൾ',
    ta: 'Morbeez கலப்பு விதிகள்',
    kn: 'Morbeez ಮಿಕ್ಸ್ ನಿಯಮಗಳು',
    hi: 'Morbeez मिक्स नियम',
  },
  knowledge_fallback: {
    en: 'Morbeez field guide (verified rules)',
    ml: 'മോർബീസ് ഫീൽഡ് ഗൈഡ് (സ്ഥിരീകരിച്ച നിയമങ്ങൾ)',
    ta: 'Morbeez வழிகாட்டி',
    kn: 'Morbeez ಮಾರ್ಗದರ್ಶಿ',
    hi: 'Morbeez फील्ड गाइड',
  },
  crop_doctor_reuse: {
    en: 'similar successful Morbeez diagnosis',
    ml: 'സമാന വിജയകരമായ മോർബീസ് രോഗനിർണയം',
    ta: 'ஒத்த வெற்றிகரமான Morbeez நோய் கண்டறிதல்',
    kn: 'ಇದೇ ರೀತಿಯ ಯಶಸ್ಸು Morbeez ನಿರ್ಣಯ',
    hi: 'समान सफल Morbeez निदान',
  },
  crop_doctor_openai: {
    en: 'Morbeez Crop Doctor (your plot + photo)',
    ml: 'മോർബീസ് ക്രോപ്പ് ഡോക്ടർ (നിങ്ങളുടെ പ്ലോട്ട് + ഫോട്ടോ)',
    ta: 'Morbeez Crop Doctor',
    kn: 'Morbeez Crop Doctor',
    hi: 'Morbeez Crop Doctor',
  },
  conversational_openai: {
    en: 'Morbeez advisor (your farm context)',
    ml: 'മോർബീസ് ഉപദേഷ്ടാവ് (നിങ്ങളുടെ ഫാം സന്ദർഭം)',
    ta: 'Morbeez ஆலோசகர்',
    kn: 'Morbeez ಸಲಹೆ',
    hi: 'Morbeez सलाह',
  },
  playbook: {
    en: 'Morbeez assessment playbook',
    ml: 'മോർബീസ് അസസ്മെന്റ് പ്ലേബുക്ക്',
    ta: 'Morbeez playbook',
    kn: 'Morbeez playbook',
    hi: 'Morbeez playbook',
  },
  regional_learning: {
    en: 'agronomist-verified local practices',
    ml: 'കൃഷിവിദഗ്ധർ സ്ഥിരീകരിച്ച പ്രാദേശിക പരിചയം',
    ta: 'நிபுணர் சரிபார்ப்பு',
    kn: 'ತಜ್ಞರ ಪರಿಶೀಲಿತ ಅಭ್ಯಾಸ',
    hi: 'विशेषज्ञ-सत्यापित स्थानीय अनुभव',
  },
  follow_up_memory: {
    en: 'your previous Morbeez advice + field data',
    ml: 'നിങ്ങളുടെ മുൻ മോർബീസ് ഉപദേശം + ഫീൽഡ് ഡാറ്റ',
    ta: 'உங்கள் முந்தைய Morbeez ஆலோசனை',
    kn: 'ನಿಮ್ಮ ಹಿಂದಿನ Morbeez ಸಲಹೆ',
    hi: 'आपकी पिछली Morbeez सलाह',
  },
};

export const replyAttributionService = {
  moduleLabel(module: MorbeezReplyModule, language: AdvisoryLanguage): string {
    return MODULE_LABEL[module][language] ?? MODULE_LABEL[module].en;
  },

  /** One-line farmer USP: Morbeez module, not generic internet AI. */
  buildAttributionLine(
    module: MorbeezReplyModule,
    language: AdvisoryLanguage,
    meta?: ReplyAttributionMeta
  ): string {
    const label = this.moduleLabel(module, language);
    const crop = meta?.cropType
      ? meta.cropType.charAt(0).toUpperCase() + meta.cropType.slice(1).replace(/_/g, ' ')
      : null;
    const district = meta?.district?.trim();

    if (module === 'verified_case' || module === 'crop_doctor_reuse') {
      const n = meta?.verifiedCaseCount;
      if (language === 'ml') {
        return n && n > 0 && crop && district
          ? `— മോർബീസ്: ${crop}, ${district} — ${n} സ്ഥിരീകരിച്ച കേസുകളിൽ നിന്ന് (${label}).`
          : crop
            ? `— മോർബീസ്: ${crop} — ${label} (പൊതു ഇന്റർനെറ്റ് AI അല്ല).`
            : `— മോർബീസ്: ${label} (പൊതു ChatGPT അല്ല).`;
      }
      if (n && n > 0 && crop && district) {
        return `— Morbeez: ${crop}, ${district} — from ${n} verified field case(s) (${label}). Not generic ChatGPT.`;
      }
      if (crop && district) {
        return `— Morbeez: ${crop} in ${district} — ${label}. Not a generic internet answer.`;
      }
      return `— Morbeez: ${label}. Not generic ChatGPT.`;
    }

    if (language === 'ml') {
      return crop
        ? `— മോർബീസ് ${crop}: ${label} (നിങ്ങളുടെ ഫാം സന്ദർഭം).`
        : `— മോർബീസ്: ${label}.`;
    }
    return crop
      ? `— Morbeez ${crop}: ${label} (uses your farm context).`
      : `— Morbeez: ${label}.`;
  },

  attachAttribution(
    body: string,
    module: MorbeezReplyModule,
    language: AdvisoryLanguage,
    meta?: ReplyAttributionMeta
  ): string {
    const line = this.buildAttributionLine(module, language, meta);
    if (body.includes('Not generic ChatGPT') || body.includes('പൊതു ChatGPT')) {
      return body;
    }
    if (body.includes('Morbeez:') && body.length > 400) {
      return body;
    }
    return `${body.trim()}\n\n${line}`.slice(0, 3900);
  },

  async countVerifiedCases(cropType: string, district?: string | null): Promise<number> {
    const crop = cropType.toLowerCase();
    const { data, error } = await supabase
      .from('advisory_reuse_cases')
      .select('id, district')
      .eq('crop_type', crop)
      .eq('outcome_ok', true);
    if (error || !data?.length) return 0;

    const d = district?.trim().toLowerCase();
    if (!d) return data.length;
    return data.filter((row) => {
      const rd = String(row.district ?? '').toLowerCase();
      return !rd || rd === d;
    }).length;
  },

  async logAttribution(params: {
    farmerId: string;
    module: MorbeezReplyModule;
    meta?: ReplyAttributionMeta;
  }): Promise<void> {
    await supabase.from('whatsapp_reply_attributions').insert({
      farmer_id: params.farmerId,
      channel: 'whatsapp',
      module_source: params.module,
      crop_type: params.meta?.cropType ?? null,
      district: params.meta?.district ?? null,
      reuse_case_id: params.meta?.reuseCaseId ?? null,
      metadata: {
        issueLabel: params.meta?.issueLabel,
        verifiedCaseCount: params.meta?.verifiedCaseCount,
      },
    });
  },

  async enrichMeta(meta: ReplyAttributionMeta | undefined, module: MorbeezReplyModule): Promise<ReplyAttributionMeta> {
    const base = { ...meta };
    if (
      (module === 'verified_case' || module === 'crop_doctor_reuse') &&
      base.cropType &&
      base.verifiedCaseCount == null
    ) {
      base.verifiedCaseCount = await this.countVerifiedCases(base.cropType, base.district);
    }
    return base;
  },

  /** Attach USP line, send, and log for analytics. */
  async deliverAttributedReply(params: {
    farmerId: string;
    phone: string;
    language: AdvisoryLanguage;
    body: string;
    module: MorbeezReplyModule;
    meta?: ReplyAttributionMeta;
    sendText: (phone: string, text: string) => Promise<void>;
  }): Promise<string> {
    const meta = await this.enrichMeta(params.meta, params.module);
    const text = this.attachAttribution(params.body, params.module, params.language, meta);
    await params.sendText(params.phone, text);
    await this.logAttribution({
      farmerId: params.farmerId,
      module: params.module,
      meta,
    });
    return text;
  },
};
