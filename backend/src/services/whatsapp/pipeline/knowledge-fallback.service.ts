import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';
import type { AdvisoryLanguage, StructuredAdvisory } from '../../ai/types.js';
import { aiReuseService, buildDapBucket, buildSymptomKey } from '../../ai/ai-reuse.service.js';
import { blockService } from '../../core/block.service.js';
import { supabase } from '../../../lib/supabase.js';
import {
  CALCIUM_NITRATE_MIX_WARNING,
  lookupCalciumNitratePair,
} from './calcium-nitrate-tank-mix.knowledge.js';
import {
  compatibilityLookupService,
  parseProductPairFromText,
} from './compatibility-lookup.service.js';
import {
  isConversationFollowUp,
  isDrenchOrMixQuestion,
} from './conversation-continuation.service.js';
import { farmerMemoryService, type FarmerMemorySnapshot } from './farmer-memory.service.js';
import { responseComposerService } from './response-composer.service.js';

const FALLBACK_NOTE: Record<AdvisoryLanguage, string> = {
  en: '\n\n(Verified Morbeez field guide — live AI is temporarily unavailable.)',
  ml: '\n\n(സ്ഥിരീകരിച്ച മോർബീസ് മാർഗ്ഗനിർദേശം — ലൈവ് AI താൽക്കാലികമായി ലഭ്യമല്ല.)',
  ta: '\n\n(சரிபார்க்கப்பட்ட Morbeez வழிகாட்டி — நேரடி AI தற்காலிகமாக இல்லை.)',
  kn: '\n\n(ಪರಿಶೀಲಿತ Morbeez ಮಾರ್ಗದರ್ಶಿ — ಲೈವ್ AI ತಾತ್ಕಾಲಿಕವಾಗಿ ಲಭ್ಯವಿಲ್ಲ.)',
  hi: '\n\n(सत्यापित Morbeez मार्गदर्शन — लाइव AI अस्थायी रूप से उपलब्ध नहीं.)',
};

function cropLabel(memory?: FarmerMemorySnapshot): string {
  const c = memory?.cropType ?? 'crop';
  return c.charAt(0).toUpperCase() + c.slice(1).replace(/_/g, ' ');
}

function followUpExpansion(memory: FarmerMemorySnapshot, language: AdvisoryLanguage): string | null {
  const summary = memory.lastAdvisorySummary?.trim();
  if (!summary) return null;

  const crop = cropLabel(memory);
  const map: Record<AdvisoryLanguage, string> = {
    en: `More detail on your ${crop} advice:\n\n${summary}\n\nPractical checks:\n• Jar test in a bottle before mixing the full 200 L tank.\n• Never mix Calcium Nitrate + Magnesium Sulphate in the same tank (clogging).\n• Add microbes first in clean water; avoid hot midday sun.\n• If anything is unclear, type *call* and our agronomist will help.`,
    ml: `നിങ്ങളുടെ ${crop} ഉപദേശം — കൂടുതൽ വിവരം:\n\n${summary}\n\n• 200 L ടാങ്കിന് മുമ്പ് jar test.\n• കാൽസ്യം നൈട്രേറ്റ് + മഗ്നീഷ്യം സൾഫേറ്റ് ഒരേ ടാങ്കിൽ ചേർക്കരുത്.\n• സ്പഷ്ടമല്ലെങ്കിൽ *call* ടൈപ്പ് ചെയ്യുക.`,
    ta: `உங்கள் ${crop} ஆலோசனை — மேலும் விவரம்:\n\n${summary}\n\n• 200 L க்கு முன் jar test.\n• Calcium nitrate + magnesium sulphate ஒன்றாக கலக்க வேண்டாம்.\n• *call* என்று அனுப்புங்கள்.`,
    kn: `ನಿಮ್ಮ ${crop} ಸಲಹೆ — ಹೆಚ್ಚಿನ ವಿವರ:\n\n${summary}\n\n• 200 L ಮೊದಲು jar test.\n• Ca nitrate + MgSO₄ ಒಂದೇ ಟ್ಯಾಂಕിൽ ಬೇಡ.\n• *call* ಟೈಪ್ ಮಾಡಿ.`,
    hi: `आपकी ${crop} सलाह — और विवरण:\n\n${summary}\n\n• 200 L से पहले jar test.\n• Calcium nitrate + magnesium sulphate एक टैंक में न मिलाएँ.\n• *call* टाइप करें।`,
  };
  return (map[language] ?? map.en) + (FALLBACK_NOTE[language] ?? FALLBACK_NOTE.en);
}

function drenchMixGuidance(memory: FarmerMemorySnapshot | undefined, language: AdvisoryLanguage): string {
  const crop = cropLabel(memory);
  const map: Record<AdvisoryLanguage, string> = {
    en: `For your ${crop} drench (~200 L):\n\n• Trichoderma, Pseudomonas, Bacillus, Paecilomyces: beneficial microbes — usually OK together in clean, pH-neutral water.\n• Organic NPK / seaweed / triacontanol: use label rates; avoid overdosing seaweed.\n• Do NOT mix Calcium Nitrate + Magnesium Sulphate in the same tank (${CALCIUM_NITRATE_MIX_WARNING}).\n• Mix order: water → dissolve NPK → micronutrients → microbes last; always jar-test before full tank.\n• Z-sol / chelates: follow label; avoid strong acid + Ca in one mix.`,
    ml: `${crop} ഡ്രെഞ്ച് (~200 L):\n\n• ട്രൈക്കോഡർമ, പ്സീഡോമോനാസ്, ബാസillus: സാധാരണയായി ഒരുമിച്ച് OK.\n• കാൽസ്യം നൈട്രേറ്റ് + മഗ്നീഷ്യം സൾഫേറ്റ് ഒരേ ടാങ്കിൽ വേണ്ട.\n• മുഴുവൻ ടാങ്കിനും മുമ്പ് jar test.`,
    ta: `${crop} drench (~200 L): microbes பொதுவாக OK; Ca nitrate + MgSO₄ ஒன்றாக வேண்டாம்; jar test செய்யுங்கள்.`,
    kn: `${crop} drench: microbes ಸಾಮಾನ್ಯವಾಗಿ OK; Ca nitrate + MgSO₄ ಒಂದೇ ಟ್ಯಾಂಕ್ ಬೇಡ; jar test.`,
    hi: `${crop} drench: microbes आमतौर पर OK; Ca nitrate + MgSO₄ एक टैंक में नहीं; jar test करें.`,
  };
  return (map[language] ?? map.en) + (FALLBACK_NOTE[language] ?? FALLBACK_NOTE.en);
}

function scanTextForCaMgConflict(text: string, language: AdvisoryLanguage): string | null {
  const lower = text.toLowerCase();
  const hasCa = /calcium\s*nitrate|ca\s*nitrate/i.test(lower);
  const hasMg = /magnesium\s*sulphate|magnesium\s*sulfate|mgso4|epsom/i.test(lower);
  if (!hasCa || !hasMg) return null;

  const chart = lookupCalciumNitratePair('calcium nitrate', 'magnesium sulphate');
  if (!chart?.found || chart.compatible) return null;

  const body =
    language === 'ml'
      ? 'കാൽസ്യം നൈട്രേറ്റ് + മഗ്നീഷ്യം സൾഫേറ്റ് ഒരേ ഡ്രെഞ്ച്/ടാങ്കിൽ ചേർക്കരുത് — മങ്ങൽ/ക്ലോഗ് സാധ്യത.'
      : 'Do not mix Calcium Nitrate + Magnesium Sulphate in the same drench/tank — risk of precipitation and clogging.';
  return responseComposerService.compose({
    body: `${body}\n\n${chart.notes ?? CALCIUM_NITRATE_MIX_WARNING}`,
    footer: responseComposerService.advisoryDisclaimer(language),
  });
}

/**
 * Rule-based / verified-case replies when OpenAI is unavailable (quota, outage).
 * Uses advisory_reuse_cases, spray_compatibility_rules, Ca nitrate chart, and field playbooks.
 */
/** Minimal advisory object when Crop Doctor cannot call OpenAI. */
export function advisoryFromKnowledgeText(summary: string, language: AdvisoryLanguage): StructuredAdvisory {
  return {
    probableIssue: 'Field guidance (verified rules)',
    confidence: 0.58,
    uncertain: true,
    nutrientDeficiency: [],
    stressAnalysis: [],
    treatments: [],
    dosageGuidance: [],
    precautions: ['Confirm with jar test before full tank application'],
    escalationRecommended: true,
    escalationReason: 'Live AI unavailable — agronomist review recommended',
    farmerSummaryEn: summary,
    farmerSummaryMl: language === 'ml' ? summary : summary,
    recommendedProductTags: [],
  };
}

export const knowledgeFallbackService = {
  async tryReply(params: {
    farmerId: string;
    text: string;
    language: AdvisoryLanguage;
    memory?: FarmerMemorySnapshot;
    followUp?: boolean;
  }): Promise<string | null> {
    const text = params.text.trim();
    if (!text) return null;

    const memory =
      params.memory ??
      (await farmerMemoryService.build(params.farmerId, { symptomsText: text }));

    const pair = parseProductPairFromText(text);
    if (pair) {
      const lookup = await compatibilityLookupService.lookup(pair.productA, pair.productB);
      if (lookup.found) {
        logger.info(
          { farmerId: params.farmerId, pair },
          'Knowledge fallback: spray compatibility rule'
        );
        return compatibilityLookupService.formatFarmerReply(lookup, params.language, pair);
      }
    }

    const caMg = scanTextForCaMgConflict(text, params.language);
    if (caMg) {
      logger.info({ farmerId: params.farmerId }, 'Knowledge fallback: Ca nitrate chart');
      return caMg + (FALLBACK_NOTE[params.language] ?? FALLBACK_NOTE.en);
    }

    if (env.ENABLE_AI_REUSE_CACHE) {
      const { data: farmer } = await supabase
        .from('farmers')
        .select('district')
        .eq('id', params.farmerId)
        .maybeSingle();
      const district = farmer?.district ? String(farmer.district).trim().toLowerCase() : null;
      let dap = memory.dap ?? 0;
      if (memory.activePlotId) {
        const block = await blockService.getById(memory.activePlotId, params.farmerId);
        if (block) dap = block.dap;
      }
      const symptomKey = buildSymptomKey(text);
      const match = await aiReuseService.findReusableCase({
        cropType: memory.cropType,
        district,
        dapBucket: buildDapBucket(dap),
        symptomKey,
      });
      if (match) {
        logger.info(
          { farmerId: params.farmerId, issue: match.advisory.probableIssue },
          'Knowledge fallback: advisory reuse case'
        );
        const body =
          params.language === 'ml' && match.advisory.farmerSummaryMl
            ? match.advisory.farmerSummaryMl
            : match.advisory.farmerSummaryEn;
        return (
          body +
          (params.language === 'ml'
            ? '\n\n(മുൻ വിജയകരമായ കേസിൽ നിന്നുള്ള ശുപാർശ)'
            : '\n\n(From a similar verified case in your region)') +
          (FALLBACK_NOTE[params.language] ?? FALLBACK_NOTE.en)
        );
      }
    }

    if (params.followUp || isConversationFollowUp(text)) {
      const expanded = followUpExpansion(memory, params.language);
      if (expanded) {
        logger.info({ farmerId: params.farmerId }, 'Knowledge fallback: follow-up expansion');
        return expanded;
      }
    }

    if (isDrenchOrMixQuestion(text) || /correct mix|is this (ok|fine|correct)/i.test(text)) {
      logger.info({ farmerId: params.farmerId }, 'Knowledge fallback: drench/mix guidance');
      return drenchMixGuidance(memory, params.language);
    }

    if (memory.verifiedRegionalHints?.trim()) {
      const crop = cropLabel(memory);
      const hint = memory.verifiedRegionalHints.trim().slice(0, 600);
      const body =
        params.language === 'ml'
          ? `നിങ്ങളുടെ ${crop} വിളയ്ക്ക് പ്രാദേശികമായി സ്ഥിരീകരിച്ച കുറിപ്പുകൾ:\n\n${hint}\n\nകൂടുതൽ വിശകലനത്തിന് വ്യക്തമായ ഫോട്ടോ അയയ്ക്കുക അല്ലെങ്കിൽ *call* ടൈപ്പ് ചെയ്യുക.`
          : `Verified notes for your ${crop} crop in your area:\n\n${hint}\n\nSend a clear photo for full analysis or type *call* for our agronomist.`;
      return body + (FALLBACK_NOTE[params.language] ?? FALLBACK_NOTE.en);
    }

    return null;
  },
};
