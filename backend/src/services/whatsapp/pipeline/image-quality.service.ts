import { createHash } from 'crypto';
import { supabase } from '../../../lib/supabase.js';

export type ImageQualityResult =
  | { ok: true; contentHash: string }
  | { ok: false; reason: 'too_small' | 'duplicate' | 'unsupported' };

const MIN_IMAGE_BYTES = 8_000;
const MAX_IMAGE_BYTES = 8_000_000;

export function assessImageBuffer(buffer: Buffer, mimeType?: string): ImageQualityResult {
  if (mimeType && !/^image\/(jpeg|jpg|png|webp)$/i.test(mimeType)) {
    return { ok: false, reason: 'unsupported' };
  }
  if (buffer.length < MIN_IMAGE_BYTES) {
    return { ok: false, reason: 'too_small' };
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    return { ok: false, reason: 'unsupported' };
  }

  const contentHash = createHash('sha256').update(buffer).digest('hex');
  return { ok: true, contentHash };
}

export async function isDuplicateImage(farmerId: string, contentHash: string): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('farmer_image_hashes')
    .select('id')
    .eq('farmer_id', farmerId)
    .eq('content_hash', contentHash)
    .gte('created_at', since)
    .limit(1);

  return Boolean(data?.length);
}

export async function recordImageHash(farmerId: string, contentHash: string): Promise<void> {
  await supabase.from('farmer_image_hashes').insert({
    farmer_id: farmerId,
    content_hash: contentHash,
  });
}

export function imageQualityMessage(
  language: string,
  reason: 'too_small' | 'duplicate' | 'unsupported'
): string {
  const en: Record<string, string> = {
    too_small: 'Please upload a clearer, closer crop image in good daylight.',
    duplicate: 'We already received this image. Send a new photo from a different angle if possible.',
    unsupported: 'Please send a JPEG or PNG photo of your crop.',
  };
  const ml: Record<string, string> = {
    too_small: 'ദയവായി പകൽ നല്ല വെളിച്ചത്തിൽ വിളയുടെ വ്യക്തമായ ക്ലോസ്-അപ്പ് ഫോട്ടോ അയയ്ക്കുക.',
    duplicate: 'ഈ ചിത്രം ഞങ്ങൾക്ക് ലഭിച്ചിട്ടുണ്ട്. സാധ്യമെങ്കിൽ വേറെ കോണിൽ പുതിയ ഫോട്ടോ അയയ്ക്കുക.',
    unsupported: 'JPEG അല്ലെങ്കിൽ PNG ഫോട്ടോ അയയ്ക്കുക.',
  };
  const table = language === 'ml' ? ml : en;
  return table[reason] ?? en[reason];
}
