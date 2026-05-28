/** WhatsApp reply buttons (interactive type "button") — max 3 per message. */

export const WHATSAPP_MAX_REPLY_BUTTONS = 3;
export const WHATSAPP_BUTTON_TITLE_MAX = 20;

export type ReplyButtonOption = { id: string; title: string };

export function fitButtonTitle(title: string, max = WHATSAPP_BUTTON_TITLE_MAX): string {
  const t = title.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function uniqueButtonTitle(
  rawTitle: string,
  used: Set<string>,
  max = WHATSAPP_BUTTON_TITLE_MAX
): string {
  const base = fitButtonTitle(rawTitle, max);
  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${n})`;
    const room = Math.max(1, max - suffix.length);
    const stem = fitButtonTitle(base, room).trim();
    candidate = `${stem}${suffix}`;
    n += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

/**
 * Sends menu options as visible reply buttons (not list/select).
 * More than 3 options are split across multiple messages (e.g. 5 languages → 3 + 2).
 */
export async function sendReplyButtonMenu(params: {
  to: string;
  body: string;
  options: ReplyButtonOption[];
  continuationBody?: string;
  sendButtons: (p: {
    to: string;
    body: string;
    buttons: ReplyButtonOption[];
  }) => Promise<void>;
}): Promise<void> {
  const { to, body, options, continuationBody, sendButtons } = params;
  if (!options.length) return;

  for (let i = 0; i < options.length; i += WHATSAPP_MAX_REPLY_BUTTONS) {
    const chunk = options.slice(i, i + WHATSAPP_MAX_REPLY_BUTTONS);
    const chunkBody =
      i === 0 ? body : (continuationBody ?? 'More options — tap a button below:');
    const usedTitles = new Set<string>();

    await sendButtons({
      to,
      body: chunkBody,
      buttons: chunk.map((o) => ({
        id: o.id,
        title: uniqueButtonTitle(o.title, usedTitles),
      })),
    });
  }
}
