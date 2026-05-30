import { createHash } from 'crypto';
import { supabase } from '../../../lib/supabase.js';
const MIN_IMAGE_BYTES = 8_000;
const MAX_IMAGE_BYTES = 8_000_000;
function estimateEntropy(buffer) {
    const freq = new Array(256).fill(0);
    const step = Math.max(1, Math.floor(buffer.length / 50000));
    let sampled = 0;
    for (let i = 0; i < buffer.length; i += step) {
        freq[buffer[i]] += 1;
        sampled += 1;
    }
    let entropy = 0;
    for (const c of freq) {
        if (!c)
            continue;
        const p = c / sampled;
        entropy -= p * Math.log2(p);
    }
    return entropy;
}
export function assessImageBuffer(buffer, mimeType) {
    if (mimeType && !/^image\/(jpeg|jpg|png|webp)$/i.test(mimeType)) {
        return { ok: false, reason: 'unsupported' };
    }
    if (buffer.length < MIN_IMAGE_BYTES) {
        return { ok: false, reason: 'too_small' };
    }
    if (buffer.length > MAX_IMAGE_BYTES) {
        return { ok: false, reason: 'unsupported' };
    }
    if (estimateEntropy(buffer) < 4.2) {
        return { ok: false, reason: 'low_detail' };
    }
    const contentHash = createHash('sha256').update(buffer).digest('hex');
    return { ok: true, contentHash };
}
export async function isDuplicateImage(farmerId, contentHash) {
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
export async function recordImageHash(farmerId, contentHash) {
    await supabase.from('farmer_image_hashes').insert({
        farmer_id: farmerId,
        content_hash: contentHash,
    });
}
export function imageQualityMessage(language, reason) {
    const en = {
        too_small: 'Please upload a clearer, closer crop image in good daylight.',
        duplicate: 'We already received this image. Send a new photo from a different angle if possible.',
        unsupported: 'Please send a JPEG or PNG photo of your crop.',
        low_detail: 'Image quality is too low for diagnosis. Please send a sharper close photo in daylight.',
        blurry: 'Please send one close, sharp photo of the affected leaves.',
        too_dark: 'Photo is too dark. Please send a clearer photo in daylight.',
    };
    const ml = {
        too_small: 'ദയവായി പകൽ നല്ല വെളിച്ചത്തിൽ വിളയുടെ വ്യക്തമായ ക്ലോസ്-അപ്പ് ഫോട്ടോ അയയ്ക്കുക.',
        duplicate: 'ഈ ചിത്രം ഞങ്ങൾക്ക് ലഭിച്ചിട്ടുണ്ട്. സാധ്യമെങ്കിൽ വേറെ കോണിൽ പുതിയ ഫോട്ടോ അയയ്ക്കുക.',
        unsupported: 'JPEG അല്ലെങ്കിൽ PNG ഫോട്ടോ അയയ്ക്കുക.',
        low_detail: 'ചിത്രത്തിന്റെ ഗുണമേന്മ കുറവാണ്. വ്യക്തമായ ക്ലോസ്-അപ്പ് ഫോട്ടോ വീണ്ടും അയയ്ക്കുക.',
        blurry: 'ദയവായി ബാധിത ഇലയുടെ ഒരു ക്ലിയർ ക്ലോസ് ഫോട്ടോ അയയ്ക്കുക.',
        too_dark: 'ഫോട്ടോ ഇരുട്ടാണ്. പകൽ വെളിച്ചത്തിൽ വ്യക്തമായ ഫോട്ടോ അയയ്ക്കുക.',
    };
    const table = language === 'ml' ? ml : en;
    return table[reason] ?? en[reason];
}
//# sourceMappingURL=image-quality.service.js.map