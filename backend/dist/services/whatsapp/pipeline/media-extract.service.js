import { downloadWhatsAppMedia, fetchWhatsAppMediaUrl } from '../../../lib/whatsapp-media.js';
async function fetchPublicUrlAsBuffer(url) {
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Media download failed: ${res.status}`);
    const mimeType = res.headers.get('content-type') ?? 'application/octet-stream';
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, mimeType };
}
async function resolveCloudMedia(params) {
    if (params.mediaId != null && String(params.mediaId).length > 0) {
        return downloadWhatsAppMedia(String(params.mediaId));
    }
    if (params.mediaUrl) {
        return fetchWhatsAppMediaUrl(params.mediaUrl, params.fallbackMime);
    }
    return null;
}
/** Extract image/audio from Meta Cloud or Ads Gyani webhook message objects. */
export async function extractInboundMedia(params) {
    const msg = params.messageObject;
    if (!msg)
        return {};
    const isCloud = params.channel === 'whatsapp_cloud';
    if (params.msgType === 'image' || params.msgType === 'image_message') {
        const image = msg.image;
        const mediaId = image?.id ?? (msg.media_id != null ? String(msg.media_id) : undefined);
        const mediaUrl = image?.url ??
            msg.media_url ??
            msg.header_image;
        if (isCloud) {
            const resolved = await resolveCloudMedia({
                mediaId,
                mediaUrl,
                fallbackMime: image?.mime_type ?? 'image/jpeg',
            });
            if (resolved) {
                return {
                    imageBase64: resolved.buffer.toString('base64'),
                    imageMimeType: resolved.mimeType.split(';')[0],
                };
            }
        }
        else {
            if (mediaUrl) {
                const { buffer, mimeType } = await fetchPublicUrlAsBuffer(mediaUrl);
                return {
                    imageBase64: buffer.toString('base64'),
                    imageMimeType: mimeType.split(';')[0],
                };
            }
            if (mediaId != null) {
                const { buffer, mimeType } = await downloadWhatsAppMedia(String(mediaId));
                return {
                    imageBase64: buffer.toString('base64'),
                    imageMimeType: mimeType,
                };
            }
        }
    }
    if (params.msgType === 'document') {
        const doc = msg.document;
        const mime = doc?.mime_type ?? '';
        if (!mime.startsWith('image/'))
            return {};
        const mediaId = doc?.id ?? (msg.media_id != null ? String(msg.media_id) : undefined);
        const mediaUrl = doc?.url ?? msg.media_url;
        if (isCloud) {
            const resolved = await resolveCloudMedia({ mediaId, mediaUrl, fallbackMime: mime });
            if (resolved) {
                return {
                    imageBase64: resolved.buffer.toString('base64'),
                    imageMimeType: resolved.mimeType.split(';')[0],
                };
            }
        }
        else if (mediaUrl) {
            const { buffer, mimeType } = await fetchPublicUrlAsBuffer(mediaUrl);
            return {
                imageBase64: buffer.toString('base64'),
                imageMimeType: mimeType.split(';')[0],
            };
        }
    }
    if (params.msgType === 'audio' || params.msgType === 'voice' || params.msgType === 'audio_message') {
        const audio = msg.audio;
        const mediaId = audio?.id ?? (msg.media_id != null ? String(msg.media_id) : undefined);
        const mediaUrl = audio?.url ?? msg.media_url;
        if (isCloud) {
            const resolved = await resolveCloudMedia({
                mediaId,
                mediaUrl,
                fallbackMime: audio?.mime_type ?? 'audio/ogg',
            });
            if (resolved) {
                return {
                    audioBuffer: resolved.buffer,
                    audioMimeType: resolved.mimeType.split(';')[0],
                    audioDurationSec: Number(audio?.duration ?? msg.duration ?? 0) || undefined,
                };
            }
        }
        else {
            if (mediaUrl) {
                const { buffer, mimeType } = await fetchPublicUrlAsBuffer(mediaUrl);
                return {
                    audioBuffer: buffer,
                    audioMimeType: mimeType.split(';')[0],
                    audioDurationSec: Number(audio?.duration ?? msg.duration ?? 0) || undefined,
                };
            }
            if (mediaId != null) {
                const { buffer, mimeType } = await downloadWhatsAppMedia(String(mediaId));
                return {
                    audioBuffer: buffer,
                    audioMimeType: mimeType,
                    audioDurationSec: Number(audio?.duration ?? 0) || undefined,
                };
            }
        }
    }
    return {};
}
//# sourceMappingURL=media-extract.service.js.map