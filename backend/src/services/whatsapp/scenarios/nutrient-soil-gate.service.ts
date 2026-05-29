import type { StructuredAdvisory, AdvisoryLanguage } from '../../ai/types.js';
import { supabase } from '../../../lib/supabase.js';
import { conversationSessionService } from '../conversation-session.service.js';
import { soilFlowService } from './soil-flow.service.js';
import { responseComposerService } from '../pipeline/response-composer.service.js';
import { shopifyLinksService } from '../../shopify/shopify-links.service.js';
import type { SessionContext } from './session-context.types.js';
function localizedSummary(advisory: StructuredAdvisory, language: AdvisoryLanguage): string {
  if (language === 'ml' && advisory.farmerSummaryMl) return advisory.farmerSummaryMl;
  return advisory.farmerSummaryEn;
}

function validationQuestion(issue: string, language: AdvisoryLanguage): string {
  const lower = issue.toLowerCase();
  if (/thrip|silver|streak|scrap/.test(lower)) {
    return language === 'ml'
      ? 'സ്ഥിരീകരിക്കാൻ: ഇലയുടെ അടിയിൽ ചെറിയ കീടങ്ങളോ കറുത്ത മലമുണ്ടോ?'
      : 'To confirm: do you see tiny insects or black dots under the leaves?';
  }
  if (/yellow|chlorosis|deficien|nutrient|nitrogen|potassium/.test(lower)) {
    return language === 'ml'
      ? 'സ്ഥിരീകരിക്കാൻ: മഞ്ഞപ്പം താഴെ നിന്ന് മുകളിലേക്ക് പടരുന്നുണ്ടോ?'
      : 'To confirm: is yellowing spreading from lower leaves upward?';
  }
  return language === 'ml'
    ? 'സ്ഥിരീകരിക്കാൻ: പ്രശ്നം എത്ര വേഗത്തിൽ പടരുന്നു?'
    : 'To confirm: how fast is this issue spreading in the field?';
}

const NUTRIENT_PATTERN =
  /nutrient|deficien|nitrogen|potassium|phosphorus|npk|chlorosis|yellowing|മണ്ണ്|പോഷക|ஊட்டச்சத்து|पोषक|ನೈಟ್ರೋಜನ್/i;

export function suggestsNutrientDeficiency(advisory: StructuredAdvisory): boolean {
  if ((advisory.nutrientDeficiency?.length ?? 0) > 0) return true;
  const blob = [
    advisory.probableIssue,
    advisory.farmerSummaryEn,
    advisory.farmerSummaryMl,
    ...(advisory.stressAnalysis ?? []),
    ...(advisory.treatments?.map((t) => t.action) ?? []),
  ]
    .filter(Boolean)
    .join(' ');
  return NUTRIENT_PATTERN.test(blob);
}

export function soilGatePreface(language: AdvisoryLanguage): string {
  return language === 'ml'
    ? 'ഇലയിലെ ലക്ഷണങ്ങൾ പോഷക കുറവോ മറ്റ് സമ്മർദ്ദമോ സൂചിപ്പിക്കാം. വളം ശുപാർശ ചെയ്യുന്നതിന് മുമ്പ് മണ്ണ് പരിശോധന റിപ്പോർട്ട് നല്ലതാണ്.'
    : language === 'ta'
      ? 'இலை அறிகுறிகள் ஊட்டச்சத்து குறைபாடு அல்லது வேறு அழுத்தத்தைக் காட்டலாம். உரம் பரிந்துரைக்கும் முன் மண் பரிசோதனை அறிக்கை உதவும்.'
      : language === 'hi'
        ? 'पत्तियों के लक्षण पोषक की कमी या अन्य तनाव दिखा सकते हैं। उर्वरक सुझाने से पहले मिट्टी जांच रिपोर्ट बेहतर होगी।'
        : 'Leaf symptoms may point to nutrient shortage or other stress. A soil test report helps before we recommend fertilizer.';
}

export const nutrientSoilGateService = {
  suggestsNutrientDeficiency,

  async storePending(
    farmerId: string,
    payload: { sessionId: string; advisory: StructuredAdvisory }
  ): Promise<void> {
    await conversationSessionService.patchContext(farmerId, {
      pendingNutrientAdvisory: payload,
    });
  },

  async clearPending(farmerId: string): Promise<void> {
    await conversationSessionService.patchContext(farmerId, { pendingNutrientAdvisory: undefined });
  },

  async getPending(farmerId: string): Promise<SessionContext['pendingNutrientAdvisory'] | null> {
    const ctx = await conversationSessionService.getContext(farmerId);
    return ctx.pendingNutrientAdvisory ?? null;
  },

  async markSoilReportReceived(farmerId: string): Promise<void> {
    const { data: farmer } = await supabase
      .from('farmers')
      .select('metadata')
      .eq('id', farmerId)
      .maybeSingle();
    const meta = (farmer?.metadata as Record<string, unknown>) ?? {};
    await supabase
      .from('farmers')
      .update({
        metadata: {
          ...meta,
          soil_report_uploaded: true,
          soil_report_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', farmerId);
  },

  async shouldGateBeforeFertilizerAdvice(
    farmerId: string,
    advisory: StructuredAdvisory
  ): Promise<boolean> {
    if (!suggestsNutrientDeficiency(advisory)) return false;
    return !(await soilFlowService.hasSoilReport(farmerId));
  },

  async deliverPending(params: {
    farmerId: string;
    phone: string;
    language: AdvisoryLanguage;
    sendText: (phone: string, text: string) => Promise<void>;
    extraFooter?: string;
  }): Promise<{ delivered: boolean; summary: string; sessionId: string; advisory: StructuredAdvisory } | null> {
    const pending = await this.getPending(params.farmerId);
    if (!pending) return null;

    const advisory = pending.advisory;
    let body = localizedSummary(advisory, params.language);
    if (params.extraFooter) body += `\n\n${params.extraFooter}`;

    const productBlock = shopifyLinksService.formatRecommendationsForWhatsApp(
      [],
      params.language
    );
    if (productBlock) body += `\n\n${productBlock}`;

    const reply = responseComposerService.compose({
      body,
      validationQuestion: validationQuestion(advisory.probableIssue, params.language),
      footer: responseComposerService.advisoryDisclaimer(params.language),
    });

    await params.sendText(params.phone, reply);
    await this.clearPending(params.farmerId);
    return { delivered: true, summary: reply, sessionId: pending.sessionId, advisory };
  },
};
