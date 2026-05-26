import { downloadWhatsAppMedia } from '../../../lib/whatsapp-media.js';
async function fetchUrlAsBuffer(url) {
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Media download failed: ${res.status}`);
    const mimeType = res.headers.get('content-type') ?? 'application/octet-stream';
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, mimeType };
}
/** Extract image/audio from Meta Cloud or Ads Gyani webhook message objects. */
export async function extractInboundMedia(params) {
    const msg = params.messageObject;
    if (!msg)
        return {};
    if (params.msgType === 'image' || params.msgType === 'image_message') {
        const image = msg.image;
        const mediaUrl = image?.url ??
            msg.media_url ??
            msg.header_image;
        if (mediaUrl) {
            const { buffer, mimeType } = await fetchUrlAsBuffer(mediaUrl);
            return {
                imageBase64: buffer.toString('base64'),
                imageMimeType: mimeType.split(';')[0],
            };
        }
        const mediaId = image?.id ?? msg.media_id;
        if (mediaId != null && params.channel === 'whatsapp_cloud') {
            const { buffer, mimeType } = await downloadWhatsAppMedia(String(mediaId));
            return {
                imageBase64: buffer.toString('base64'),
                imageMimeType: mimeType,
            };
        }
    }
    if (params.msgType === 'audio' || params.msgType === 'voice' || params.msgType === 'audio_message') {
        const audio = msg.audio;
        const mediaUrl = audio?.url ?? msg.media_url;
        if (mediaUrl) {
            const { buffer, mimeType } = await fetchUrlAsBuffer(mediaUrl);
            return {
                audioBuffer: buffer,
                audioMimeType: mimeType.split(';')[0],
                audioDurationSec: Number(audio?.duration ?? msg.duration ?? 0) || undefined,
            };
        }
        const mediaId = audio?.id ?? msg.media_id;
        if (mediaId != null && params.channel === 'whatsapp_cloud') {
            const { buffer, mimeType } = await downloadWhatsAppMedia(String(mediaId));
            return {
                audioBuffer: buffer,
                audioMimeType: mimeType,
                audioDurationSec: Number(audio?.duration ?? 0) || undefined,
            };
        }
    }
    return {};
}
//# sourceMappingURL=media-extract.service.js.map