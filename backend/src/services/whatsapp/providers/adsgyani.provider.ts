import { env } from '../../../config/env.js';
import { AppError } from '../../../lib/errors.js';
import { normalizePhone } from '../../../lib/phone.js';

/**
 * Ads Gyani (adsgyani.in) — WA Mantra REST API v1.0
 *
 * POST {apiBase}/{vendorUid}/contact/send-message
 * POST {apiBase}/{vendorUid}/contact/send-template-message
 *
 * @see https://adsgyani.in/api-docs.pdf
 */
function requireConfig() {
  const base = env.ADS_GYANI_API_BASE?.replace(/\/$/, '');
  const vendorUid = env.ADS_GYANI_TENANT?.trim();
  const token = env.ADS_GYANI_API_TOKEN?.trim();
  if (!base || !vendorUid || !token) {
    throw new AppError('Ads Gyani WhatsApp not configured', 503, 'ADS_GYANI_NOT_CONFIGURED');
  }
  return { base, vendorUid, token };
}

/** Ads Gyani: numeric only, country code, no + or leading 0 (e.g. 919876543210) */
function phoneForApi(to: string): string {
  const digits = normalizePhone(to).replace(/\D/g, '');
  return digits.replace(/^0+/, '');
}

async function postJson(path: string, body: Record<string, unknown>): Promise<void> {
  const { base, vendorUid, token } = requireConfig();
  const url = `${base}/${vendorUid}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new AppError('Ads Gyani send failed', res.status, 'ADS_GYANI_SEND_FAILED', raw);
  }

  try {
    const json = JSON.parse(raw) as { result?: string; message?: string };
    if (json.result && json.result !== 'success') {
      throw new AppError(
        json.message ?? 'Ads Gyani send failed',
        502,
        'ADS_GYANI_SEND_FAILED',
        raw
      );
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    // Non-JSON success body — treat as OK
  }
}

export const adsgyaniWhatsAppProvider = {
  async sendText(to: string, text: string): Promise<void> {
    const path = env.ADS_GYANI_SEND_TEXT_PATH ?? '/contact/send-message';
    await postJson(path, {
      phone_number: phoneForApi(to),
      message_body: text,
    });
  },

  async sendTemplate(
    to: string,
    templateName: string,
    params: { body: string[] }
  ): Promise<void> {
    const path = env.ADS_GYANI_SEND_TEMPLATE_PATH ?? '/contact/send-template-message';
    const payload: Record<string, unknown> = {
      phone_number: phoneForApi(to),
      template_name: templateName,
      template_language: env.ADS_GYANI_TEMPLATE_LANGUAGE ?? 'en',
    };
    params.body.forEach((value, i) => {
      if (i < 4) payload[`field_${i + 1}`] = value;
    });
    await postJson(path, payload);
  },
};
