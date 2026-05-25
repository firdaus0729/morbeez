import { openaiWhisperProvider } from './providers/openai.provider.js';
const LANG_HINT = {
    en: 'en',
    ml: 'ml',
    hi: 'hi',
    ta: 'ta',
    kn: 'kn',
};
export const transcriptionService = {
    async transcribeVoice(audioBuffer, mimeType, language) {
        return openaiWhisperProvider.transcribe({
            audioBuffer,
            mimeType,
            languageHint: LANG_HINT[language] ?? 'en',
        });
    },
};
//# sourceMappingURL=transcription.service.js.map