import type { InboundMessage } from './types.js';
import type { AdvisoryLanguage } from '../../ai/types.js';
export declare const leadCaptureService: {
    captureAndIdentify(msg: InboundMessage, language: AdvisoryLanguage): Promise<{
        farmerId: any;
        phone: string;
        language: AdvisoryLanguage;
        isPremium: boolean;
        hadHistoricalLead: boolean;
    }>;
};
//# sourceMappingURL=lead-capture.service.d.ts.map