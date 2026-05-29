import type { AdvisoryLanguage } from '../../ai/types.js';
import { conversationSessionService } from '../conversation-session.service.js';
import {
  extractPriorProduct,
  extractSuggestedDiagnosis,
  isFarmerDisagreementIntent,
  looksLikePriorExperience,
} from '../../core/farmer-feedback-intent.service.js';
import { farmerExperienceLearningService } from '../../core/farmer-experience-learning.service.js';
import { supabase } from '../../../lib/supabase.js';
import type { ScenarioSenders } from './whatsapp-scenario-router.service.js';

export type FarmerFeedbackCaptureStep =
  | 'diagnosis'
  | 'experience_years'
  | 'experience'
  | 'product'
  | 'outcome';

function ackDisagreement(lang: AdvisoryLanguage): string {
  if (lang === 'ml') {
    return 'മനസ്സിലായി 👍\n\nനിങ്ങൾ കരുതുന്ന പ്രശ്നം എന്താണ്?';
  }
  if (lang === 'ta') {
    return 'புரிந்தது 👍\n\nஉங்கள் கருத்துப்படி பிரச்சனை என்ன?';
  }
  if (lang === 'kn') {
    return 'ಅರ್ಥವಾಯಿತು 👍\n\nನೀವು ಯಾವ ಸಮಸ್ಯೆ ಎಂದು ಭಾವಿಸುತ್ತೀರಿ?';
  }
  if (lang === 'hi') {
    return 'समझ गया 👍\n\nआपको क्या समस्या लगती है?';
  }
  return 'Understood 👍\n\nWhat do you think the issue is?';
}

function askExperienceYears(lang: AdvisoryLanguage): string {
  if (lang === 'ml') {
    return 'ഈ വിള കൃഷി ചെയ്ത് എത്ര വർഷമായി? (സംഖ്യ മാത്രം, ഉദാ: 15)';
  }
  if (lang === 'hi') {
    return 'इस फसल की खेती आप कितने साल से कर रहे हैं? (संख्या, उदा: 15)';
  }
  return 'How many years have you been growing this crop? (number only, e.g. 15)';
}

function askExperience(lang: AdvisoryLanguage): string {
  if (lang === 'ml') {
    return 'ഇതുപോലുള്ള ലക്ഷണങ്ങൾ മുമ്പ് കണ്ടിട്ടുണ്ടോ?\n\nമുമ്പ് ഏത് ചികിത്സ ഫലപ്രദമായിരുന്നു?';
  }
  if (lang === 'ta') {
    return 'இதுபோன்ற அறிகுறிகளை முன்பு பார்த்திருக்கிறீர்களா?\n\nஎந்த சிகிச்சை வேலை செய்தது?';
  }
  return 'Have you seen similar symptoms before?\n\nWhat treatment worked previously? (product name if you remember)';
}

function askProduct(lang: AdvisoryLanguage): string {
  if (lang === 'ml') return 'ഏത് ഉൽപ്പന്നം / സ്പ്രേ ഉപയോഗിച്ചിരുന്നു?';
  return 'Which product or spray did you use? (or type "none")';
}

function askOutcome(lang: AdvisoryLanguage): string {
  if (lang === 'ml') return 'ഫലം എങ്ങനെയായിരുന്നു? (മെച്ചം / ഭാഗികം / ഇല്ല)';
  return 'What was the outcome? (improved / partial / no change)';
}

function submittedReply(lang: AdvisoryLanguage): string {
  if (lang === 'ml') {
    return 'നന്ദി! നിങ്ങളുടെ അനുഭവം ഞങ്ങളുടെ വിദഗ്ധർ പരിശോധിക്കും. സ്ഥിരീകരിച്ചാൽ ഭാവിയിൽ മെച്ചപ്പെട്ട ഉപദേശം ലഭിക്കും.';
  }
  return 'Thank you! Our agronomist team will review your experience. Verified learnings help future advice for farmers in your area.';
}

async function farmerHasExperienceYears(farmerId: string): Promise<boolean> {
  const { data } = await supabase
    .from('farmers')
    .select('crop_experience_years')
    .eq('id', farmerId)
    .maybeSingle();
  return data?.crop_experience_years != null && Number(data.crop_experience_years) > 0;
}

function parseExperienceYears(text: string): number | null {
  const m = text.replace(/\D/g, '');
  const n = parseInt(m, 10);
  if (!Number.isFinite(n) || n < 0 || n > 60) return null;
  return n;
}

async function nextStepAfterDiagnosis(
  farmerId: string,
  feedbackId: string
): Promise<FarmerFeedbackCaptureStep> {
  if (!(await farmerHasExperienceYears(farmerId))) {
    await farmerExperienceLearningService.updateCapture(feedbackId, {
      capture_step: 'experience_years',
    });
    return 'experience_years';
  }
  await farmerExperienceLearningService.updateCapture(feedbackId, { capture_step: 'experience' });
  return 'experience';
}

export const farmerFeedbackFlowService = {
  isDisagreementIntent: isFarmerDisagreementIntent,

  async canStartDisagreement(farmerId: string): Promise<{
    sessionId: string | null;
    aiIssue: string | null;
    aiConfidence: number | null;
  } | null> {
    const ctx = await conversationSessionService.getContext(farmerId);
    const sessionId = ctx.diagnosis?.lastSessionId ?? ctx.lastAdvisorySessionId ?? null;
    if (!sessionId) return null;

    const { data: output } = await supabase
      .from('ai_advisory_outputs')
      .select('probable_issue')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: sess } = await supabase
      .from('ai_advisory_sessions')
      .select('confidence_score')
      .eq('id', sessionId)
      .maybeSingle();

    return {
      sessionId,
      aiIssue: output?.probable_issue ? String(output.probable_issue) : null,
      aiConfidence: sess?.confidence_score != null ? Number(sess.confidence_score) : null,
    };
  },

  async startFlow(params: {
    farmerId: string;
    phone: string;
    lang: AdvisoryLanguage;
    send: ScenarioSenders;
    initialText?: string;
  }): Promise<void> {
    const meta = await this.canStartDisagreement(params.farmerId);
    const initialDx = params.initialText ? extractSuggestedDiagnosis(params.initialText) : null;
    const priorProduct = params.initialText ? extractPriorProduct(params.initialText) : null;

    const fb = await farmerExperienceLearningService.createFromDisagreement({
      farmerId: params.farmerId,
      sessionId: meta?.sessionId ?? null,
      blockId: null,
      aiProbableIssue: meta?.aiIssue ?? null,
      aiConfidence: meta?.aiConfidence ?? null,
      initialFarmerDiagnosis: initialDx,
      initialText: params.initialText,
    });

    let step: FarmerFeedbackCaptureStep = initialDx ? await nextStepAfterDiagnosis(params.farmerId, fb.id) : 'diagnosis';
    if (priorProduct) {
      await farmerExperienceLearningService.updateCapture(fb.id, {
        farmer_prior_product: priorProduct,
        capture_step: 'outcome',
      });
      step = 'outcome';
    }

    await conversationSessionService.patchContext(params.farmerId, {
      farmerFeedbackId: fb.id,
      farmerFeedbackStep: step,
    });
    await conversationSessionService.setState(params.farmerId, 'farmer_feedback_capture');

    if (step === 'diagnosis') {
      await params.send.text(params.phone, ackDisagreement(params.lang));
    } else if (step === 'experience_years') {
      await params.send.text(params.phone, askExperienceYears(params.lang));
    } else if (step === 'experience') {
      await params.send.text(params.phone, askExperience(params.lang));
    } else {
      await params.send.text(params.phone, askOutcome(params.lang));
    }
  },

  async tryHandleCapture(params: {
    farmerId: string;
    phone: string;
    lang: AdvisoryLanguage;
    text: string;
    send: ScenarioSenders;
  }): Promise<boolean> {
    const ctx = await conversationSessionService.getContext(params.farmerId);
    const feedbackId = ctx.farmerFeedbackId;
    const step = ctx.farmerFeedbackStep;
    if (!feedbackId || !step) return false;

    const text = params.text.trim();
    if (!text || text.startsWith('menu.')) return false;

    if (step === 'diagnosis') {
      const dx = extractSuggestedDiagnosis(text) || text.slice(0, 200);
      await farmerExperienceLearningService.updateCapture(feedbackId, {
        farmer_suggested_diagnosis: dx,
      });
      const next = await nextStepAfterDiagnosis(params.farmerId, feedbackId);
      await conversationSessionService.patchContext(params.farmerId, {
        farmerFeedbackStep: next,
      });
      if (next === 'experience_years') {
        await params.send.text(params.phone, askExperienceYears(params.lang));
      } else {
        await params.send.text(params.phone, askExperience(params.lang));
      }
      return true;
    }

    if (step === 'experience_years') {
      const years = parseExperienceYears(text);
      if (years == null) {
        await params.send.text(params.phone, askExperienceYears(params.lang));
        return true;
      }
      await farmerExperienceLearningService.saveCropExperienceYears(
        params.farmerId,
        years,
        feedbackId
      );
      await farmerExperienceLearningService.updateCapture(feedbackId, {
        crop_experience_years: years,
        capture_step: 'experience',
      });
      await conversationSessionService.patchContext(params.farmerId, {
        farmerFeedbackStep: 'experience',
      });
      await params.send.text(params.phone, askExperience(params.lang));
      return true;
    }

    if (step === 'experience') {
      const product = extractPriorProduct(text);
      await farmerExperienceLearningService.updateCapture(feedbackId, {
        farmer_prior_experience: text.slice(0, 1000),
        farmer_prior_product: product ?? undefined,
        capture_step: product ? 'outcome' : 'product',
      });
      if (product || looksLikePriorExperience(text)) {
        await conversationSessionService.patchContext(params.farmerId, {
          farmerFeedbackStep: 'outcome',
        });
        await params.send.text(params.phone, askOutcome(params.lang));
      } else {
        await conversationSessionService.patchContext(params.farmerId, {
          farmerFeedbackStep: 'product',
        });
        await params.send.text(params.phone, askProduct(params.lang));
      }
      return true;
    }

    if (step === 'product') {
      const product = /^none$/i.test(text) ? null : text.slice(0, 200);
      await farmerExperienceLearningService.updateCapture(feedbackId, {
        farmer_prior_product: product,
        capture_step: 'outcome',
      });
      await conversationSessionService.patchContext(params.farmerId, {
        farmerFeedbackStep: 'outcome',
      });
      await params.send.text(params.phone, askOutcome(params.lang));
      return true;
    }

    if (step === 'outcome') {
      let outcome = text.slice(0, 200);
      if (/improved|better|മെച്ചം|சரி/i.test(text)) outcome = 'improved';
      else if (/partial|ഭാഗിക/i.test(text)) outcome = 'partial';
      else if (/no|not|ഇല്ല/i.test(text)) outcome = 'no_change';

      await farmerExperienceLearningService.updateCapture(feedbackId, {
        farmer_prior_outcome: outcome,
      });
      await farmerExperienceLearningService.submitForReview(feedbackId);

      await conversationSessionService.patchContext(params.farmerId, {
        farmerFeedbackId: undefined,
        farmerFeedbackStep: undefined,
      });
      await conversationSessionService.setState(params.farmerId, 'main_menu');

      await params.send.text(params.phone, submittedReply(params.lang));
      return true;
    }

    return false;
  },
};
