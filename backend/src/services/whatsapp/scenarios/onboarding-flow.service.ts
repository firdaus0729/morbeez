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
    if (step === 'pincode') {
      return pincodePrompt(lang);
    }
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

export function pincodePrompt(lang: AdvisoryLanguage): string {
  if (lang === 'ml') {
    return 'നിങ്ങളുടെ പ്രദേശത്തിന്റെ 6 അക്ക പിൻകോഡ് അയയ്ക്കുക. (ഉദാ: 680001)';
  }
  if (lang === 'ta') {
    return 'உங்கள் பகுதியின் 6 இலக்க பின்கோடை அனுப்பவும். (எ.கா: 680001)';
  }
  if (lang === 'kn') {
    return 'ನಿಮ್ಮ ಪ್ರದೇಶದ 6 ಅಂಕಿಯ ಪಿನ್‌ಕೋಡ್ ಕಳುಹಿಸಿ. (ಉದಾ: 680001)';
  }
  if (lang === 'hi') {
    return 'अपने क्षेत्र का 6 अंकों का पिनकोड भेजें। (उदा: 680001)';
  }
  return 'Please send your 6-digit area pincode. (Example: 680001)';
}

export function invalidPincodeReply(lang: AdvisoryLanguage): string {
  if (lang === 'ml') {
    return 'സാധുവായ 6 അക്ക പിൻകോഡ് അയയ്ക്കുക. ഞങ്ങളുടെ പട്ടികയിൽ ഇല്ലെങ്കിൽ ടെലികോളർ സഹായിക്കും.';
  }
  if (lang === 'ta') {
    return 'சரியான 6 இலக்க பின்கோடை அனுப்பவும். எங்கள் பட்டியலில் இல்லை என்றால் எங்கள் குழு உதவும்.';
  }
  if (lang === 'kn') {
    return 'ಮಾನ್ಯ 6 ಅಂಕಿಯ ಪಿನ್‌ಕೋಡ್ ಕಳುಹಿಸಿ. ನಮ್ಮ ಪಟ್ಟಿಯಲ್ಲಿ ಇಲ್ಲದಿದ್ದರೆ ನಮ್ಮ ತಂಡ ಸಹಾಯ ಮಾಡುತ್ತದೆ.';
  }
  if (lang === 'hi') {
    return 'कृपया मान्य 6 अंकों का पिनकोड भेजें। अगर हमारी सूची में नहीं है तो हमारी टीम मदद करेगी।';
  }
  return 'Please send a valid 6-digit pincode. If yours is not in our list, our team will help you register it.';
}

export function pincodeSavedReply(
  lang: AdvisoryLanguage,
  district: string,
  state: string
): string {
  const place = [district, state].filter(Boolean).join(', ');
  if (lang === 'ml') {
    return `നന്ദി! പ്രദേശം: ${place}.`;
  }
  if (lang === 'ta') {
    return `நன்றி! பகுதி: ${place}.`;
  }
  if (lang === 'kn') {
    return `ಧನ್ಯವಾದ! ಪ್ರದೇಶ: ${place}.`;
  }
  if (lang === 'hi') {
    return `धन्यवाद! क्षेत्र: ${place}.`;
  }
  return `Thanks! Area: ${place}.`;
}

export function parsePincodeInput(text: string): string | null {
  const digits = text.replace(/\D/g, '');
  return digits.length === 6 ? digits : null;
}
