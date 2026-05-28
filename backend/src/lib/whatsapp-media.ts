import { env } from '../config/env.js';
import { AppError } from './errors.js';

/** Download WhatsApp Cloud API media by ID */
export async function downloadWhatsAppMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  if (!env.WHATSAPP_ACCESS_TOKEN) {
    throw new AppError('WhatsApp not configured', 503, 'WHATSAPP_NOT_CONFIGURED');
  }

  const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` },
  });
  if (!metaRes.ok) {
    throw new AppError('Media metadata failed', metaRes.status, 'WHATSAPP_MEDIA_META_FAILED');
  }

  const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
  if (!meta.url) throw new AppError('No media URL', 502, 'WHATSAPP_MEDIA_URL_MISSING');

  return fetchWhatsAppMediaUrl(meta.url, meta.mime_type ?? 'image/jpeg');
}

/** Download bytes from a Meta CDN URL (requires the same Bearer token as Graph API). */
export async function fetchWhatsAppMediaUrl(
  url: string,
  fallbackMime = 'application/octet-stream'
): Promise<{ buffer: Buffer; mimeType: string }> {
  if (!env.WHATSAPP_ACCESS_TOKEN) {
    throw new AppError('WhatsApp not configured', 503, 'WHATSAPP_NOT_CONFIGURED');
  }

  const fileRes = await fetch(url, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` },
  });
  if (!fileRes.ok) {
    throw new AppError('Media download failed', fileRes.status, 'WHATSAPP_MEDIA_DOWNLOAD_FAILED');
  }

  const mimeType = (fileRes.headers.get('content-type') ?? fallbackMime).split(';')[0];
  const arrayBuffer = await fileRes.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType,
  };
}
