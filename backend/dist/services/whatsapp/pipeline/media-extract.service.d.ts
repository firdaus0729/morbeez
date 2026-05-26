import type { InboundChannel } from './types.js';
import type { MediaExtractResult } from './types.js';
/** Extract image/audio from Meta Cloud or Ads Gyani webhook message objects. */
export declare function extractInboundMedia(params: {
    channel: InboundChannel;
    msgType: string;
    messageObject?: Record<string, unknown>;
}): Promise<MediaExtractResult>;
//# sourceMappingURL=media-extract.service.d.ts.map