/** Detect farmer follow-ups that must continue the last advisory — never reset to welcome/FAQ. */

const FOLLOW_UP_RE =
  /\b(explain|clarify|elaborate|more detail|in more detail|tell me more|what do you mean|what does that mean|why did you say|can you expand|go deeper|more specific|more information)\b/i;

const SHORT_CLARIFY_RE =
  /^(could you|can you|please)?\s*(explain|clarify|elaborate)\b/i;

/** Product / drench / tank-mix lists (multi-line farmer messages). */
const DRENCH_MIX_RE =
  /\b(drench|drenching|tank\s*mix|foliar|per\s+\d+\s*l|ltr|liter|ml\b|trichoderma|pseudomonas|bacillus|npk|seaweed|triacontanol|paecilomyces)\b/i;

export function isConversationFollowUp(text: string): boolean {
  const t = text.trim();
  if (t.length < 8) return false;
  if (SHORT_CLARIFY_RE.test(t)) return true;
  if (FOLLOW_UP_RE.test(t)) return true;
  return false;
}

export function isDrenchOrMixQuestion(text: string): boolean {
  const t = text.trim();
  if (t.length < 12) return false;
  if (DRENCH_MIX_RE.test(t)) return true;
  if (/\b(correct mix|is this (ok|fine|correct)|this mix)\b/i.test(t)) return true;
  return false;
}

export function shouldUseConversationalContinuation(text: string): boolean {
  return isConversationFollowUp(text) || isDrenchOrMixQuestion(text);
}
