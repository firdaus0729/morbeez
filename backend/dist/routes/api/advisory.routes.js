import { z } from 'zod';
import { verifyInternalApiKey } from '../../middleware/webhookVerify.js';
import { cropDoctorService } from '../../services/ai/crop-doctor.service.js';
import { transcriptionService } from '../../services/ai/transcription.service.js';
import { ValidationError } from '../../lib/errors.js';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const diagnoseSchema = z.object({
    phone: z.string().min(10),
    name: z.string().optional(),
    cropType: z.string().default('ginger'),
    cropStage: z.string().optional(),
    language: z.enum(['en', 'ml', 'ta', 'kn', 'hi']).default('en'),
    symptomsText: z.string().max(2000).optional(),
    voiceTranscript: z.string().max(5000).optional(),
    imageBase64: z.string().optional(),
    imageMimeType: z.string().optional(),
});
export async function advisoryRoutes(app) {
    app.addHook('preHandler', verifyInternalApiKey);
    app.post('/api/v1/advisory/diagnose', async (request, reply) => {
        const body = diagnoseSchema.parse(request.body);
        if (body.imageBase64) {
            const bytes = Buffer.byteLength(body.imageBase64, 'base64');
            if (bytes > MAX_IMAGE_BYTES) {
                throw new ValidationError('Image exceeds 5MB limit');
            }
            if (!body.imageMimeType?.startsWith('image/')) {
                throw new ValidationError('imageMimeType must be image/*');
            }
        }
        if (!body.imageBase64 && !body.symptomsText && !body.voiceTranscript) {
            throw new ValidationError('Provide image, symptoms, or voice transcript');
        }
        const result = await cropDoctorService.diagnoseByPhone({
            phone: body.phone,
            name: body.name,
            cropType: body.cropType,
            cropStage: body.cropStage,
            language: body.language,
            symptomsText: body.symptomsText,
            voiceTranscript: body.voiceTranscript,
            imageBase64: body.imageBase64,
            imageMimeType: body.imageMimeType,
            channel: 'api',
        });
        const summary = body.language === 'ml' ? result.advisory.farmerSummaryMl : result.advisory.farmerSummaryEn;
        return reply.code(201).send({
            ok: true,
            sessionId: result.sessionId,
            escalated: result.escalated,
            confidence: result.advisory.confidence,
            summary,
            advisory: result.advisory,
            products: result.productRecommendations,
            disclaimer: 'AI-assisted recommendation only. Consult a Morbeez agronomist for final guidance.',
        });
    });
    app.post('/api/v1/advisory/voice', async (request, reply) => {
        const body = z
            .object({
            phone: z.string().min(10),
            cropType: z.string().default('ginger'),
            language: z.enum(['en', 'ml']).default('en'),
            audioBase64: z.string(),
            audioMimeType: z.string().default('audio/ogg'),
        })
            .parse(request.body);
        const audioBuffer = Buffer.from(body.audioBase64, 'base64');
        if (audioBuffer.length > 10 * 1024 * 1024) {
            throw new ValidationError('Audio exceeds 10MB limit');
        }
        const transcript = await transcriptionService.transcribeVoice(audioBuffer, body.audioMimeType, body.language);
        const result = await cropDoctorService.diagnoseByPhone({
            phone: body.phone,
            cropType: body.cropType,
            language: body.language,
            voiceTranscript: transcript,
            channel: 'api',
        });
        return reply.code(201).send({
            ok: true,
            transcript,
            sessionId: result.sessionId,
            summary: body.language === 'ml'
                ? result.advisory.farmerSummaryMl
                : result.advisory.farmerSummaryEn,
            escalated: result.escalated,
        });
    });
    app.get('/api/v1/advisory/:sessionId', async (request, reply) => {
        const { sessionId } = request.params;
        const session = await cropDoctorService.getSession(sessionId);
        return reply.send({ ok: true, session });
    });
    app.post('/api/v1/advisory/:sessionId/callback', async (request, reply) => {
        const { sessionId } = request.params;
        const body = z.object({ farmerId: z.string().uuid() }).parse(request.body);
        await cropDoctorService.requestCallback(sessionId, body.farmerId);
        return reply.code(201).send({ ok: true, message: 'Callback requested' });
    });
}
//# sourceMappingURL=advisory.routes.js.map