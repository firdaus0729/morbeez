import type { AdvisoryLanguage } from '../../ai/types.js';

export type InboundChannel = 'whatsapp_cloud' | 'whatsapp_adsgyani';

export interface InboundMessage {
  channel: InboundChannel;
  phone: string;
  messageId: string;
  msgType: string;
  text: string;
  profileName?: string;
  rawPayload: Record<string, unknown>;
  /** Meta Cloud message object or Ads Gyani message object */
  messageObject?: Record<string, unknown>;
  attribution?: {
    campaignSource?: string;
    referralSource?: string;
    affiliateSource?: string;
  };
}

export interface PipelineFarmerContext {
  farmerId: string;
  phone: string;
  language: AdvisoryLanguage;
  cropType: string;
  cropStage?: string;
  isPremium: boolean;
}

export interface MediaExtractResult {
  imageBase64?: string;
  imageMimeType?: string;
  audioBuffer?: Buffer;
  audioMimeType?: string;
  audioDurationSec?: number;
}
