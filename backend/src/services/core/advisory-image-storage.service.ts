import { randomUUID } from 'node:crypto';
import { supabase } from '../../lib/supabase.js';
import { logger } from '../../lib/logger.js';

const BUCKET = 'advisory-images';
const MAX_BYTES = 8 * 1024 * 1024;

/** Persist farmer WhatsApp / API crop photos for agronomist case review. */
export const advisoryImageStorageService = {
  async uploadFromBase64(
    farmerId: string,
    dataBase64: string,
    mimeType = 'image/jpeg'
  ): Promise<string | null> {
    const raw = dataBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(raw, 'base64');
    if (!buffer.length) return null;
    if (buffer.length > MAX_BYTES) {
      logger.warn({ farmerId, bytes: buffer.length }, 'Advisory image too large — skipped storage');
      return null;
    }

    const ext =
      mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const path = `${farmerId}/${randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    });

    if (error) {
      logger.error({ err: error, farmerId }, 'Advisory image upload failed');
      return null;
    }

    return path;
  },
};

export async function resolveAdvisoryImageUrl(path: string | null | undefined): Promise<string | null> {
  if (!path?.trim()) return null;
  const key = path.trim();

  if (/^https?:\/\//i.test(key)) return key;

  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(key, 3600);
  if (!signErr && signed?.signedUrl) return signed.signedUrl;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return data?.publicUrl ?? null;
}

export function urlFromWhatsAppPayload(payload: Record<string, unknown> | null | undefined): string | null {
  if (!payload) return null;
  const image = payload.image as Record<string, string> | undefined;
  if (image?.url?.startsWith('http')) return image.url;
  const mediaUrl = payload.media_url;
  if (typeof mediaUrl === 'string' && mediaUrl.startsWith('http')) return mediaUrl;
  const headerImage = payload.header_image;
  if (typeof headerImage === 'string' && headerImage.startsWith('http')) return headerImage;
  return null;
}
