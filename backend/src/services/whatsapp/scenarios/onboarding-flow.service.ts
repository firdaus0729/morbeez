import { supabase } from '../../../lib/supabase.js';
import { conversationSessionService } from '../conversation-session.service.js';
import type { AdvisoryLanguage } from '../../ai/types.js';

/** Whether farmer finished language → acre → plot → planting date. */
export const onboardingFlowService = {
  async isComplete(farmerId: string): Promise<boolean> {
    const ctx = await conversationSessionService.getContext(farmerId);
    if (ctx.onboardingComplete === true) return true;
    if (ctx.onboardingComplete === false) return false;

    const { data: session } = await supabase
      .from('conversation_sessions')
      .select('state')
      .eq('farmer_id', farmerId)
      .eq('channel', 'whatsapp')
      .maybeSingle();
    if (session?.state === 'language_select' || session?.state === 'onboarding_minimal') {
      return false;
    }

    const { data: block } = await supabase
      .from('farm_blocks')
      .select('planting_date, acreage_decimal, crop_type')
      .eq('farmer_id', farmerId)
      .is('archived_at', null)
      .order('is_primary', { ascending: false })
      .limit(1)
      .maybeSingle();

    return Boolean(
      block?.planting_date && block?.acreage_decimal != null && block?.crop_type?.trim()
    );
  },

  async markComplete(farmerId: string): Promise<void> {
    await conversationSessionService.patchContext(farmerId, {
      onboardingStep: undefined,
      onboardingAcreageBucket: undefined,
      onboardingComplete: true,
    });
    await conversationSessionService.setState(farmerId, 'main_menu');
  },

  currentStepPrompt(step: string | undefined, lang: AdvisoryLanguage): string {
    if (step === 'acreage') {
      return lang === 'ml'
        ? 'ദയവായി ആദ്യം ഏക്കർ തിരഞ്ഞെടുക്കുക.'
        : 'Please choose your cultivation area (acre) first.';
    }
    if (step === 'crop' || step === 'custom_crop') {
      return lang === 'ml'
        ? 'ദയവായി നിങ്ങളുടെ പ്ലോട്ട് (വിള) തിരഞ്ഞെടുക്കുക.'
        : 'Please select your crop plot next.';
    }
    if (step === 'planting_date') {
      return plantingDatePrompt(lang);
    }
    return lang === 'ml'
      ? 'ദയവായി ഓൺബോർഡിംഗ് ഘട്ടങ്ങൾ പൂർത്തിയാക്കുക.'
      : 'Please complete onboarding steps first.';
  },
};

export function plantingDatePrompt(lang: AdvisoryLanguage): string {
  return lang === 'ml'
    ? 'നടീൽ തീയതി DDMMYYYY ഫോർമാറ്റിൽ അയക്കുക. (ഉദാ: 28052026)'
    : 'Send Date of planting in DDMMYYYY format. (Example: 28052026)';
}
