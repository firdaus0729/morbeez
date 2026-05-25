import type { StructuredAdvisory } from '../types.js';
import type { TranscriptionProvider, VisionProvider } from './base.provider.js';
export declare const openaiVisionProvider: VisionProvider;
export declare const openaiWhisperProvider: TranscriptionProvider;
/** Text-only advisory when no image */
export declare function openaiTextAdvisory(systemPrompt: string, userPrompt: string): Promise<StructuredAdvisory>;
//# sourceMappingURL=openai.provider.d.ts.map