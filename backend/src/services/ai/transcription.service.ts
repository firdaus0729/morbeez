import { openaiWhisperProvider } from './providers/openai.provider.js';

const LANG_HINT: Record<string, string> = {
  en: 'en',
  ml: 'ml',
  hi: 'hi',
  ta: 'ta',
  kn: 'kn',
};

export const transcriptionService = {
  async transcribeVoice(audioBuffer: Buffer, mimeType: string, language: string): Promise<string> {
    return openaiWhisperProvider.transcribe({
      audioBuffer,
      mimeType,
      languageHint: LANG_HINT[language] ?? 'en',
    });
  },
};
