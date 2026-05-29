export type AgricultureInputCategory =
  | 'disease_stress'
  | 'insect'
  | 'weed'
  | 'root_soil'
  | 'compatibility'
  | 'cultivation'
  | 'unknown_low_conf';

export type ClassificationResult = {
  category: AgricultureInputCategory;
  confidence: number;
  signals: string[];
};

export type VisionClassificationInput = {
  category: AgricultureInputCategory;
  confidence: number;
  photoQuality?: 'ok' | 'blurry' | 'too_dark' | 'unknown';
};

const INSECT_TERMS =
  /\b(insect|pest|bug|caterpillar|larvae|larva|egg|chewing|borer|thrips|aphid|whitefly|mite|hopper|beetle)\b/i;

const WEED_TERMS = /\b(weed|weeds|unwanted plant|grass spread|herbicide)\b/i;

const ROOT_TERMS =
  /\b(root|roots|rhizome|nematode|soft root|drainage|root rot)\b/i;

const COMPATIBILITY_TERMS =
  /\b(mix|tank mix|compatible|compatibility|jar test|spray together|combine|phytotoxic)\b/i;

const CULTIVATION_TERMS =
  /\b(irrigation|fertilizer|fertigation|harvest|spray timing|intercrop|labour|labor|dose|dosage)\b/i;

const DISEASE_TERMS =
  /\b(disease|fungus|fungal|bacterial|blight|spot|wilt|yellow|chlorosis|mildew)\b/i;

/** Regional terms (separate patterns to keep main regex readable). */
const REGIONAL_INSECT = /[\u0D15\u0D40\u0D1F]|[\u0D2A\u0D41\u0D34\u0D41]|[\u0B95\u0BC0\u0B9F]|[\u0C95\u0CC0\u0C9F]|[\u0915\u0940\u091F]/;
const REGIONAL_WEED = /[\u0B95\u0BB3\u0BC8]|[\u0C95\u0CB3\u0CC6]|[\u0916\u0930\u092A\u0924\u0935\u093E\u0930]/;
const REGIONAL_ROOT = /[\u0D35\u0D47\u0D30]|[\u0D30\u0D48\u0D38\u0D4B\u0D02]|[\u0BB5\u0BC7\u0BB0\u0BCD]|[\u0C85\u0CA1\u0CBF]|[\u091C\u0921\u093C]/;
const REGIONAL_DISEASE = /[\u0D30\u0D4B\u0D17]|[\u0BA8\u0BCB\u0BAF\u0BCD]|[\u0CB0\u0CCB\u0C97]|[\u0930\u094B\u0917]/;

/**
 * Rule-based agriculture input classifier (Phase 1).
 * Vision tags can be added in Phase 2 without changing callers.
 */
export const inputClassifierService = {
  classifyText(text?: string | null, options?: { hasCropMedia?: boolean }): ClassificationResult {
    const t = text?.trim() ?? '';
    const signals: string[] = [];
    const hasMedia = options?.hasCropMedia ?? false;

    if (!t && hasMedia) {
      return { category: 'disease_stress', confidence: 0.55, signals: ['media_only'] };
    }
    if (!t) {
      return { category: 'unknown_low_conf', confidence: 0.2, signals: ['empty'] };
    }

    const scores: Record<AgricultureInputCategory, number> = {
      disease_stress: 0,
      insect: 0,
      weed: 0,
      root_soil: 0,
      compatibility: 0,
      cultivation: 0,
      unknown_low_conf: 0,
    };

    if (COMPATIBILITY_TERMS.test(t)) {
      scores.compatibility += 3;
      signals.push('compatibility');
    }
    if (INSECT_TERMS.test(t) || REGIONAL_INSECT.test(t)) {
      scores.insect += 3;
      signals.push('insect');
    }
    if (WEED_TERMS.test(t) || REGIONAL_WEED.test(t)) {
      scores.weed += 3;
      signals.push('weed');
    }
    if (ROOT_TERMS.test(t) || REGIONAL_ROOT.test(t)) {
      scores.root_soil += 2.5;
      signals.push('root_soil');
    }
    if (DISEASE_TERMS.test(t) || REGIONAL_DISEASE.test(t)) {
      scores.disease_stress += 2;
      signals.push('disease');
    }
    if (CULTIVATION_TERMS.test(t)) {
      scores.cultivation += 2;
      signals.push('cultivation');
    }

    if (hasMedia && scores.insect < 1 && scores.weed < 1) {
      scores.disease_stress += 1;
      signals.push('media_boost');
    }

    let best: AgricultureInputCategory = 'unknown_low_conf';
    let bestScore = 0;
    for (const [cat, score] of Object.entries(scores) as Array<[AgricultureInputCategory, number]>) {
      if (score > bestScore) {
        bestScore = score;
        best = cat;
      }
    }

    if (bestScore === 0) {
      return {
        category: hasMedia ? 'disease_stress' : 'cultivation',
        confidence: hasMedia ? 0.45 : 0.35,
        signals: ['default'],
      };
    }

    const confidence = Math.min(0.95, 0.4 + bestScore * 0.12);
    if (confidence < 0.5 && best !== 'disease_stress') {
      return { category: 'unknown_low_conf', confidence, signals };
    }

    return { category: best, confidence, signals };
  },

  shouldUsePlaybook(result: ClassificationResult): boolean {
    if (result.category === 'disease_stress' || result.category === 'cultivation') return false;
    if (result.category === 'unknown_low_conf') return result.confidence >= 0.45;
    return result.confidence >= 0.5;
  },

  /** Merge text + vision; vision wins when clearly stronger. */
  mergeWithVision(
    textResult: ClassificationResult,
    vision: VisionClassificationInput | null | undefined
  ): ClassificationResult {
    if (!vision) return textResult;

    const signals = [...textResult.signals, 'vision'];
    if (vision.photoQuality && vision.photoQuality !== 'ok') {
      signals.push(`photo_${vision.photoQuality}`);
    }

    if (vision.confidence >= textResult.confidence + 0.12) {
      return {
        category: vision.category,
        confidence: vision.confidence,
        signals,
      };
    }

    if (textResult.category === 'disease_stress' && vision.confidence >= 0.65) {
      if (vision.category !== 'disease_stress' && vision.category !== 'cultivation') {
        return { category: vision.category, confidence: vision.confidence, signals };
      }
    }

    return {
      ...textResult,
      confidence: Math.min(0.95, Math.max(textResult.confidence, vision.confidence * 0.85)),
      signals,
    };
  },
};
